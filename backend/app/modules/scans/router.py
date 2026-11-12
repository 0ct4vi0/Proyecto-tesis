import httpx
import time
import uuid
from datetime import datetime, timezone
from ipaddress import IPv4Address
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from modules.auth.db import get_conn
from modules.auth.security import get_current_user

router = APIRouter()

# CAMBIO: URL del webhook de n8n — moverla a .env más adelante (N8N_WEBHOOK_URL)
# N8N_WEBHOOK_URL = "http://host.docker.internal:5678/webhook/iniciar-escaneo"  Nodo publicado
N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/iniciar-escaneo"

SCANS: dict[str, dict] = {}

SCAN_TIMEOUT_SECONDS = 3 * 60 * 60


class ScanRequest(BaseModel):
    network: IPv4Address  # ej. "192.168.1.10"


class ScanFinished(BaseModel):
    status: Literal["completed", "failed"] = "completed"


def _report_preferences(user: dict) -> tuple[str, bool]:
    """
    Preferencias de Configuración del usuario:
      - correo al que llega el reporte (el alternativo si lo cargó, si no el de la cuenta)
      - si quiere recibir aviso cuando el escaneo no encuentra vulnerabilidades
    """
    with get_conn() as conn:
        prefs = conn.execute(
            "SELECT correo_reporte, avisar_sin_hallazgos FROM usuarios WHERE id = %s::uuid",
            (user["id"],),
        ).fetchone()

    if prefs is None:
        return user["email"], True
    return prefs["correo_reporte"] or user["email"], prefs["avisar_sin_hallazgos"]


@router.post("/start")
def start_scan(payload: ScanRequest, user: dict = Depends(get_current_user)):
    ip = payload.network

    if ip.is_unspecified or ip.is_multicast or ip.is_reserved:
        raise HTTPException(
            status_code=422,
            detail="La dirección IP no es un objetivo escaneable",
        )

    target_ip = str(ip)
    scan_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()

    report_email, notify_no_findings = _report_preferences(user)

    SCANS[scan_id] = {
        "status": "running",
        "started_ts": time.time(),
        "user_id": user["id"],
    }

    n8n_payload = {
        "scan_id": scan_id,
        "target_ip": target_ip,
        "started_at": started_at,
        "user_id": user["id"],
        "user_email": report_email,
        "notify_no_findings": notify_no_findings,
    }

    try:
        response = httpx.post(N8N_WEBHOOK_URL, json=n8n_payload, timeout=5.0)
        response.raise_for_status()
    except httpx.HTTPError as e:
        print(f"Error al llamar al webhook de n8n: {e}")
        SCANS.pop(scan_id, None)
        raise HTTPException(status_code=502, detail="No se pudo contactar a n8n")

    print(f"Escaneo {scan_id} disparado para {target_ip} (usuario {user['id']})")
    return {"status": "received", "scan_id": scan_id, "network": target_ip}


# El front consulta este endpoint cada tanto (polling). Solo responde al dueño del escaneo.
@router.get("/{scan_id}")
def get_scan_status(scan_id: uuid.UUID, user: dict = Depends(get_current_user)):
    key = str(scan_id)
    scan = SCANS.get(key)
    # 404 también si es de otro usuario: no se revela que el escaneo existe
    if scan is None or scan["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")

    if scan["status"] == "running" and time.time() - scan["started_ts"] > SCAN_TIMEOUT_SECONDS:
        scan["status"] = "timeout"

    return {"scan_id": key, "status": scan["status"]}

@router.post("/{scan_id}/finish")
def finish_scan(scan_id: uuid.UUID, payload: ScanFinished):
    key = str(scan_id)
    scan = SCANS.get(key)
    if scan is None:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")

    scan["status"] = payload.status
    print(f"Escaneo {key} marcado como {payload.status}")
    return {"scan_id": key, "status": payload.status}