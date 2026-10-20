import subprocess
import xml.etree.ElementTree as ET
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Nmap Scan API")

class ScanRequest(BaseModel):
    target: str
    # CAMBIO: se agregó -sS (SYN scan) a los argumentos por defecto,
    # tal como se pidió (sudo nmap -sS -sV <ip>), manteniendo -T4
    arguments: str = "-T4 -sS -sV"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/scan")
def scan(req: ScanRequest):
    cmd = ["nmap"] + req.arguments.split() + ["-oX", "-", req.target]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Scan timed out")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    # CORRECCIÓN: se pasa req.target como parámetro explícito, ya que
    # "req" no existe dentro del scope de parse_nmap_xml (esa variable
    # solo vive dentro de scan()) — esto causaba un NameError
    return parse_nmap_xml(result.stdout, req.target)

def parse_nmap_xml(xml_data: str, target: str):
    root = ET.fromstring(xml_data)

    # CAMBIO: en vez de devolver {"hosts": [...]} con "ports" anidados
    # por host (útil para escanear varias IPs a la vez), acá se aplana
    # todo a un único array "puertos" en español, porque el sub-workflow
    # de n8n escanea una sola IP por vez y espera justamente ese formato:
    # {"puertos": [{"puerto", "protocolo", "servicio", "estado"}, ...]}
    puertos = []
    for host in root.findall("host"):
        ports_el = host.find("ports")
        if ports_el is not None:
            for port in ports_el.findall("port"):
                state = port.find("state")
                service = port.find("service")
                puertos.append({
                    "puerto": port.get("portid"),
                    "protocolo": port.get("protocol"),
                    "estado": state.get("state") if state is not None else None,
                    "servicio": service.get("name") if service is not None else None,
                })

    return {"objetivo": target, "puertos": puertos}