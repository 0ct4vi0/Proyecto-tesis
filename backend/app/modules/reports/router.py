import json
import unicodedata
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

# ============================================================
# [B1] ADAPTADOR
# Ajustá estas dos importaciones y las dos funciones de abajo
# a cómo ya lo hace modules/scans/router.py (mismo usuario, misma BD).
# ============================================================
from modules.auth.security import get_current_user  # dependencia que valida el token
from modules.auth.db import get_conn  # devuelve una conexión a db_tesis (filas como dict)


def _user_id(user) -> str:
    """Saca el id del usuario, sea dict u objeto."""
    if isinstance(user, dict):
        return str(user["id"])
    return str(user.id)


def _run_query(sql: str, params: tuple) -> list:
    """Ejecuta un SELECT y devuelve una lista de dicts (funciona con filas tupla o dict)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            cols = [getattr(c, "name", None) or c[0] for c in cur.description]
            rows = cur.fetchall()
    finally:
        conn.close()
    return [r if isinstance(r, dict) else dict(zip(cols, r)) for r in rows]


# ============================================================
# [B2] UTILIDADES
# ============================================================
_SEVERITY_MAP = {
    "critico": "critico", "critica": "critico", "critical": "critico",
    "alto": "alto", "alta": "alto", "high": "alto",
    "medio": "medio", "media": "medio", "medium": "medio",
    "bajo": "bajo", "baja": "bajo", "low": "bajo",
}


def _normalize_severity(value) -> Optional[str]:
    """'Crítico' / 'CRITICAL' / 'critico' -> 'critico'. Desconocido -> None."""
    if not value:
        return None
    text = unicodedata.normalize("NFD", str(value))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn").strip().lower()
    return _SEVERITY_MAP.get(text)


def _normalize_cves(value) -> List[str]:
    """Devuelve siempre una lista de strings, venga como lista, JSON o texto."""
    if value is None:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(v) for v in value if v]
    return []


def _build_row(r: dict) -> dict:
    fecha = r.get("fecha")
    cvss = r.get("cvss")
    return {
        "scanId": r["scan_id"],
        "ip": r["ip"],
        "date": fecha.isoformat() if hasattr(fecha, "isoformat") else str(fecha),
        "cves": _normalize_cves(r.get("cves")),
        "port": r["puerto"],
        "protocol": r["protocolo"],
        "service": r["servicio"],
        "cvss": float(cvss) if cvss is not None else None,
        "severity": _normalize_severity(r.get("severidad")),
    }


# ============================================================
# [B3] ENDPOINT  GET /reports
#   ?scan_id=texto        -> coincide con cualquier parte del id
#   ?severidad=alto&severidad=critico  -> uno o varios estados
# ============================================================
router = APIRouter(prefix="/reports", tags=["reports"])

_BASE_FROM = """
    FROM escaneos e
    JOIN puertos_escaneo p ON p.scan_id = e.scan_id
    WHERE e.usuario_id = %s::uuid
"""


@router.get("")
def list_reports(
    scan_id: Optional[str] = Query(None, max_length=64),
    severidad: Optional[List[str]] = Query(None),
    user=Depends(get_current_user),
):
    uid = _user_id(user)
    term = (scan_id or "").strip().lower()

    sql = (
        """
        SELECT e.scan_id::text AS scan_id,
               host(e.target_ip) AS ip,
               e.hora_inicio AS fecha,
               p.puerto, p.protocolo, p.servicio, p.cvss, p.severidad,
               to_jsonb(p.cves) AS cves
        """
        + _BASE_FROM
        + """
          AND strpos(e.scan_id::text, %s) > 0
        ORDER BY e.hora_inicio DESC, p.cvss DESC NULLS LAST, p.puerto
        LIMIT 1000
        """
    )
    rows = [_build_row(r) for r in _run_query(sql, (uid, term))]

    # filtro por estado (se hace acá porque la BD puede guardarlo en distintos formatos)
    wanted = {s for s in (_normalize_severity(x) for x in (severidad or [])) if s}
    if wanted:
        rows = [r for r in rows if r["severity"] in wanted]

    total = _run_query("SELECT count(*) AS n" + _BASE_FROM, (uid,))[0]["n"]
    return {"total": int(total), "rows": rows}