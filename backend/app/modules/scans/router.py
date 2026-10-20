import httpx
import time
import uuid
from datetime import datetime, timezone
from ipaddress import IPv4Address
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# CAMBIO: URL del webhook de n8n — moverla a .env más adelante (N8N_WEBHOOK_URL)
N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/iniciar-escaneo"

# CAMBIO: estado de los escaneos en memoria -> {scan_id: {"status": ..., "started_ts": ...}}
# Estados: "running" | "completed" | "failed" | "timeout".
# Se pierde si el backend se reinicia (con uvicorn --reload, cada vez que se guarda
# un archivo). Alcanza para el prototipo; más adelante se puede mover a db_tesis.
SCANS: dict[str, dict] = {}

# CAMBIO: si n8n nunca avisa que terminó (el workflow falló, se cortó, etc.), pasado
# este tiempo el escaneo se da por vencido para que el front no gire para siempre.
# (Un escaneo de OpenVAS de una sola IP tardó ~1:33 h; 3 h deja margen.)
SCAN_TIMEOUT_SECONDS = 3 * 60 * 60


class ScanRequest(BaseModel):
    # Una sola IPv4 válida. Pydantic responde 422 si no lo es (texto libre,
    # rangos CIDR, octetos > 255, etc.). Se mantiene el nombre "network".
    network: IPv4Address  # ej. "192.168.1.10"


class ScanFinished(BaseModel):
    # CAMBIO: lo que n8n le manda al backend cuando termina el workflow
    status: Literal["completed", "failed"] = "completed"


@router.post("/start")
def start_scan(payload: ScanRequest):
    ip = payload.network

    # Descarta direcciones que son IPv4 válidas pero no escaneables:
    # 0.0.0.0 (sin especificar), 224.0.0.0/4 (multicast) y 240.0.0.0/4
    # (reservadas, incluye 255.255.255.255).
    if ip.is_unspecified or ip.is_multicast or ip.is_reserved:
        raise HTTPException(
            status_code=422,
            detail="La dirección IP no es un objetivo escaneable",
        )

    target_ip = str(ip)
    scan_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()

    # CAMBIO: se registra el escaneo como "running" antes de llamar a n8n
    SCANS[scan_id] = {"status": "running", "started_ts": time.time()}

    n8n_payload = {
        "scan_id": scan_id,
        "target_ip": target_ip,
        "started_at": started_at,
    }

    try:
        response = httpx.post(N8N_WEBHOOK_URL, json=n8n_payload, timeout=5.0)
        response.raise_for_status()
    except httpx.HTTPError as e:
        print(f"Error al llamar al webhook de n8n: {e}")
        SCANS.pop(scan_id, None)  # no se pudo arrancar: no queda nada que seguir
        raise HTTPException(status_code=502, detail="No se pudo contactar a n8n")

    print(f"Escaneo {scan_id} disparado para {target_ip}")
    return {"status": "received", "scan_id": scan_id, "network": target_ip}


# CAMBIO: el front consulta este endpoint cada tanto (polling) para saber
# si el escaneo ya terminó y dejar de mostrar el radar girando.
@router.get("/{scan_id}")
def get_scan_status(scan_id: uuid.UUID):
    key = str(scan_id)
    scan = SCANS.get(key)
    if scan is None:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")

    if scan["status"] == "running" and time.time() - scan["started_ts"] > SCAN_TIMEOUT_SECONDS:
        scan["status"] = "timeout"

    return {"scan_id": key, "status": scan["status"]}


# CAMBIO: n8n llama a este endpoint al final del workflow para avisar que terminó.
# Por ahora sin autenticación (prototipo); más adelante conviene un token compartido.
@router.post("/{scan_id}/finish")
def finish_scan(scan_id: uuid.UUID, payload: ScanFinished):
    key = str(scan_id)
    scan = SCANS.get(key)
    if scan is None:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")

    scan["status"] = payload.status
    print(f"Escaneo {key} marcado como {payload.status}")
    return {"scan_id": key, "status": payload.status}
