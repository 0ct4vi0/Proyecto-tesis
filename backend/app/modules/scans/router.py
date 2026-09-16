from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ScanRequest(BaseModel):
    network: str  # ej. "192.168.1.0/24"

@router.post("/start")
def start_scan(payload: ScanRequest):
    print(f"Recibido pedido de escaneo para: {payload.network}")
    return {"status": "received", "network": payload.network}