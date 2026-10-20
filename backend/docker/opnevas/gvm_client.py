"""
gvm_client.py

Encapsula toda la comunicación GMP (Greenbone Management Protocol) con el
stack OpenVAS/Greenbone. n8n NUNCA habla GMP directamente: llama a los
endpoints REST de este wrapper (FastAPI), y este módulo traduce esas
llamadas a comandos GMP reales usando python-gvm.

Todas las credenciales y parámetros de conexión salen de variables de
entorno (nunca hardcodeadas), para evitar el finding de "credenciales
hardcodeadas" detectado en la evaluación de la tesis.
"""

import os
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Optional

from gvm.connections import TLSConnection, UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform
from gvm.errors import GvmError

# --- Configuración por variables de entorno -------------------------------

GVM_CONN_TYPE = os.getenv("GVM_CONN_TYPE", "tls")  # "tls" o "socket"
GVM_HOST = os.getenv("GVM_HOST", "openvas")
GVM_PORT = int(os.getenv("GVM_PORT", "9390"))
GVM_SOCKET_PATH = os.getenv("GVM_SOCKET_PATH", "/run/gvmd/gvmd.sock")
GVM_USERNAME = os.getenv("GVM_USERNAME")
GVM_PASSWORD = os.getenv("GVM_PASSWORD")

# UUIDs por defecto de instalaciones estándar de Greenbone. NO están
# garantizados en toda instalación: por eso exponemos /scan-configs y
# /scanners para que el propio operador (o n8n) los consulte en vez de
# asumir estos valores a ciegas.
DEFAULT_SCAN_CONFIG_NAME = "Full and fast"
DEFAULT_SCANNER_NAME = "OpenVAS Default"
DEFAULT_PORT_LIST_NAME = "All IANA assigned TCP and UDP"


class GvmClientError(Exception):
    """Error de alto nivel para que main.py lo traduzca a HTTPException."""
    pass


def _get_connection():
    if GVM_CONN_TYPE == "socket":
        return UnixSocketConnection(path=GVM_SOCKET_PATH)
    return TLSConnection(hostname=GVM_HOST, port=GVM_PORT)


@contextmanager
def _open_session():
    if not GVM_USERNAME or not GVM_PASSWORD:
        raise GvmClientError(
            "GVM_USERNAME / GVM_PASSWORD no configurados en el entorno"
        )
    connection = _get_connection()
    transform = EtreeCheckCommandTransform()
    # CAMBIO: los errores al conectar con gvmd (socket caído, "Connection
    # refused", fallo de autenticación) se lanzaban como GvmError fuera de
    # cualquier try y la API respondía 500 sin explicación. Ahora se
    # convierten en GvmClientError, que main.py traduce a 502/503 con un
    # mensaje claro.
    try:
        with Gmp(connection, transform=transform) as gmp:
            gmp.authenticate(GVM_USERNAME, GVM_PASSWORD)
            yield gmp
    except GvmError as exc:
        raise GvmClientError(f"Error de comunicación con GVM: {exc}") from exc


def check_health() -> dict:
    """Verifica que se puede autenticar contra gvmd."""
    try:
        with _open_session() as gmp:
            version = gmp.get_version()
            return {"status": "ok", "gmp_version": version.xpath("string(//version)")}
    except GvmError as exc:
        raise GvmClientError(f"No se pudo conectar/autenticar contra GVM: {exc}") from exc


def list_scan_configs() -> list[dict]:
    with _open_session() as gmp:
        response = gmp.get_scan_configs()
        return [
            {"id": c.get("id"), "name": c.findtext("name")}
            for c in response.xpath("config")
        ]


def list_scanners() -> list[dict]:
    with _open_session() as gmp:
        response = gmp.get_scanners()
        return [
            {"id": s.get("id"), "name": s.findtext("name")}
            for s in response.xpath("scanner")
        ]


def list_port_lists() -> list[dict]:
    with _open_session() as gmp:
        response = gmp.get_port_lists()
        return [
            {"id": p.get("id"), "name": p.findtext("name")}
            for p in response.xpath("port_list")
        ]


def _find_id_by_name(items: list[dict], name: str) -> Optional[str]:
    for item in items:
        if item["name"] == name:
            return item["id"]
    return None


def _unique_scan_suffix(base: str) -> str:
    """
    CAMBIO: GVM exige que el nombre de cada target sea único. Antes el nombre
    era "target-<task_name o IP>", así que un segundo escaneo contra el mismo
    objetivo fallaba con "Response Error 400. Target exists already" (y la
    API respondía 500 a n8n). Ahora cada escaneo lleva timestamp + un id
    corto aleatorio, lo que permite repetir escaneos sobre la misma IP y
    deja cada corrida identificable en la interfaz de Greenbone.
    """
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{base}-{stamp}-{uuid.uuid4().hex[:6]}"


def create_and_start_scan(
    target_hosts: str,
    scan_config_id: Optional[str] = None,
    scanner_id: Optional[str] = None,
    port_list_id: Optional[str] = None,
    task_name: Optional[str] = None,
) -> dict:
    """
    Crea target + task en GVM y arranca el escaneo.
    Si no se pasan config_id/scanner_id/port_list_id, resuelve por nombre
    usando los defaults estándar de Greenbone.
    """
    with _open_session() as gmp:
        if not scan_config_id:
            configs = [
                {"id": c.get("id"), "name": c.findtext("name")}
                for c in gmp.get_scan_configs().xpath("config")
            ]
            scan_config_id = _find_id_by_name(configs, DEFAULT_SCAN_CONFIG_NAME)
            if not scan_config_id:
                raise GvmClientError(
                    f"No se encontró scan config '{DEFAULT_SCAN_CONFIG_NAME}'. "
                    "Consultá /scan-configs y pasá scan_config_id explícito."
                )

        if not scanner_id:
            scanners = [
                {"id": s.get("id"), "name": s.findtext("name")}
                for s in gmp.get_scanners().xpath("scanner")
            ]
            scanner_id = _find_id_by_name(scanners, DEFAULT_SCANNER_NAME)
            if not scanner_id:
                raise GvmClientError(
                    f"No se encontró scanner '{DEFAULT_SCANNER_NAME}'. "
                    "Consultá /scanners y pasá scanner_id explícito."
                )

        if not port_list_id:
            port_lists = [
                {"id": p.get("id"), "name": p.findtext("name")}
                for p in gmp.get_port_lists().xpath("port_list")
            ]
            port_list_id = _find_id_by_name(port_lists, DEFAULT_PORT_LIST_NAME)
            if not port_list_id:
                raise GvmClientError(
                    f"No se encontró port list '{DEFAULT_PORT_LIST_NAME}'. "
                    "Consultá /port-lists y pasá port_list_id explícito."
                )

        # CAMBIO: el mismo sufijo único se usa para target y task, así los
        # dos quedan emparejados en la interfaz de Greenbone.
        name_suffix = _unique_scan_suffix(task_name or target_hosts)

        target_id = None
        try:
            target_response = gmp.create_target(
                name=f"target-{name_suffix}",
                hosts=[target_hosts],
                port_list_id=port_list_id,
            )
            target_id = target_response.get("id")

            task_response = gmp.create_task(
                name=f"scan-{name_suffix}",
                config_id=scan_config_id,
                target_id=target_id,
                scanner_id=scanner_id,
            )
            task_id = task_response.get("id")

            start_response = gmp.start_task(task_id)
            report_id = start_response.xpath("string(report_id)") or None
        except GvmError as exc:
            # CAMBIO: cualquier error de GMP (incluido GvmResponseError) se
            # convierte en GvmClientError para que main.py responda con un
            # mensaje claro en lugar de un 500 genérico. Si el target ya se
            # había creado, se elimina para no dejar huérfanos en Greenbone.
            if target_id:
                try:
                    gmp.delete_target(target_id, ultimate=True)
                except GvmError:
                    pass
            raise GvmClientError(f"Error de GVM al crear/iniciar el escaneo: {exc}") from exc

        return {
            "task_id": task_id,
            "target_id": target_id,
            "report_id": report_id,
            "status": "requested",
        }


def get_task_status(task_id: str) -> dict:
    # CAMBIO: antes, si GVM rechazaba la consulta (por ejemplo un task_id
    # inexistente o mal formado) se lanzaba un GvmResponseError que no
    # capturaba nadie y la API respondía 500. Ahora cualquier GvmError se
    # convierte en GvmClientError, que main.py traduce a 404 con un mensaje
    # claro. Esto es importante para el ciclo de polling de n8n.
    try:
        with _open_session() as gmp:
            response = gmp.get_task(task_id)
            task = response.find("task")
            if task is None:
                raise GvmClientError(f"Task {task_id} no encontrada")
            status = task.findtext("status")
            progress = task.findtext("progress")
            last_report = task.find("last_report/report")
            report_id = last_report.get("id") if last_report is not None else None
            return {
                "task_id": task_id,
                "status": status,
                "progress": progress,
                "report_id": report_id,
            }
    except GvmError as exc:
        raise GvmClientError(
            f"Error de GVM al consultar la task {task_id}: {exc}"
        ) from exc


def _extraer_cves(nvt) -> list[str]:
    """CVE asociados a un resultado, tomados de las referencias del NVT."""
    if nvt is None:
        return []
    cves = {
        ref.get("id").strip()
        for ref in nvt.findall("refs/ref")
        if (ref.get("type") or "").lower() == "cve" and ref.get("id")
    }
    # Compatibilidad con versiones que traen <cve> como texto ("CVE-A, CVE-B" o "NOCVE")
    legacy = nvt.findtext("cve")
    if legacy and legacy.strip().upper() != "NOCVE":
        cves.update(
            c.strip() for c in legacy.split(",")
            if c.strip().upper().startswith("CVE-")
        )
    return sorted(cves)

def get_task_results(task_id: str) -> dict:
    """Resultados del último reporte de la task (solo de ese escaneo)."""
    with _open_session() as gmp:
        task = gmp.get_task(task_id).find("task")
        if task is None:
            raise GvmClientError(f"Task {task_id} no encontrada")
        last_report = task.find("last_report/report")
        if last_report is None:
            raise GvmClientError(f"La task {task_id} todavía no tiene reporte")
        report_id = last_report.get("id")

        response = gmp.get_report(
            report_id,
            filter_string="min_qod=0",
            ignore_pagination=True,
            details=True,
        )
        vulnerabilities = []
        for result in response.xpath("report/report/results/result"):
            nvt = result.find("nvt")
            cves = _extraer_cves(nvt)
            vulnerabilities.append({
                "id": result.get("id"),
                "name": result.findtext("name"),
                "host": result.findtext("host"),
                "port": result.findtext("port"),
                "threat": result.findtext("threat"),
                "severity_cvss": result.findtext("severity"),
                "cves": cves,
                "cve": ", ".join(cves) or None,
                "description": result.findtext("description"),
            })
        return {"task_id": task_id, "report_id": report_id,
                "count": len(vulnerabilities), "results": vulnerabilities}

    

def delete_task(task_id: str) -> dict:
    with _open_session() as gmp:
        gmp.delete_task(task_id, ultimate=True)
        return {"task_id": task_id, "deleted": True} 