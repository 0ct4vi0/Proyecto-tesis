"""
main.py — openvas-api

Wrapper REST sobre OpenVAS/Greenbone (GMP), pensado para ser llamado desde
n8n con el nodo HTTP Request, siguiendo el mismo patrón que nmap-api.

Endpoints:
  GET  /health                -> chequea conexión/autenticación contra gvmd
  GET  /scan-configs          -> lista scan configs disponibles (para elegir sin hardcodear)
  GET  /scanners              -> lista scanners disponibles
  GET  /port-lists            -> lista port lists disponibles
  POST /scan                  -> crea target+task y arranca el escaneo
  GET  /scan/{task_id}/status -> estado/progreso del escaneo
  GET  /scan/{task_id}/results-> resultados parseados (CVSS real, no puertos Nmap)
  DELETE /scan/{task_id}      -> limpieza de la task en GVM
"""

from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import gvm_client
from .gvm_client import GvmClientError

app = FastAPI(
    title="openvas-api",
    description="Wrapper REST para OpenVAS/Greenbone, consumido por n8n vía HTTP Request",
    version="1.0.0",
)


class ScanRequest(BaseModel):
    target_hosts: str = Field(..., description="IP o rango, ej: 192.168.56.10")
    task_name: Optional[str] = Field(None, description="Nombre lógico del escaneo")
    scan_config_id: Optional[str] = Field(None, description="Opcional: UUID de scan config")
    scanner_id: Optional[str] = Field(None, description="Opcional: UUID de scanner")
    port_list_id: Optional[str] = Field(None, description="Opcional: UUID de port list")


@app.get("/health")
def health():
    try:
        return gvm_client.check_health()
    except GvmClientError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/scan-configs")
def scan_configs():
    try:
        return gvm_client.list_scan_configs()
    except GvmClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/scanners")
def scanners():
    try:
        return gvm_client.list_scanners()
    except GvmClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/port-lists")
def port_lists():
    try:
        return gvm_client.list_port_lists()
    except GvmClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/scan")
def start_scan(payload: ScanRequest):
    try:
        return gvm_client.create_and_start_scan(
            target_hosts=payload.target_hosts,
            scan_config_id=payload.scan_config_id,
            scanner_id=payload.scanner_id,
            port_list_id=payload.port_list_id,
            task_name=payload.task_name,
        )
    except GvmClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/scan/{task_id}/status")
def scan_status(task_id: str):
    try:
        return gvm_client.get_task_status(task_id)
    except GvmClientError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.get("/scan/{task_id}/results")
def scan_results(task_id: str):
    try:
        return gvm_client.get_task_results(task_id)
    except GvmClientError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.delete("/scan/{task_id}")
def scan_delete(task_id: str):
    try:
        return gvm_client.delete_task(task_id)
    except GvmClientError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
