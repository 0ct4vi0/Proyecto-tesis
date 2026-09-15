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


def _open_session() -> Gmp:
    if not GVM_USERNAME or not GVM_PASSWORD:
        raise GvmClientError(
            "GVM_USERNAME / GVM_PASSWORD no configurados en el entorno"
        )
    connection = _get_connection()
    transform = EtreeCheckCommandTransform()
    gmp = Gmp(connection, transform=transform)
    gmp.connect()
    gmp.authenticate(GVM_USERNAME, GVM_PASSWORD)
    return gmp


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

        name_suffix = task_name or target_hosts
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

        return {
            "task_id": task_id,
            "target_id": target_id,
            "report_id": report_id,
            "status": "requested",
        }


def get_task_status(task_id: str) -> dict:
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


def get_task_results(task_id: str) -> dict:
    """
    Devuelve los resultados ya parseados a JSON simple, con foco en lo que
    Postgres necesita: CVSS real por hallazgo (no estado de puerto de Nmap).
    """
    with _open_session() as gmp:
        response = gmp.get_results(task_id=task_id, filter_string="rows=1000")
        vulnerabilities = []
        for result in response.xpath("result"):
            nvt = result.find("nvt")
            vulnerabilities.append({
                "id": result.get("id"),
                "name": result.findtext("name"),
                "host": result.findtext("host"),
                "port": result.findtext("port"),
                "threat": result.findtext("threat"),
                "severity_cvss": result.findtext("severity"),
                "cve": nvt.findtext("cve") if nvt is not None else None,
                "description": result.findtext("description"),
            })
        return {"task_id": task_id, "count": len(vulnerabilities), "results": vulnerabilities}


def delete_task(task_id: str) -> dict:
    with _open_session() as gmp:
        gmp.delete_task(task_id, ultimate=True)
        return {"task_id": task_id, "deleted": True}
