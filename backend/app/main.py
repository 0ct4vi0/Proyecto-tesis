from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules import scans  # ahora resuelve a modules/scans/__init__.py -> router.py

app = FastAPI(title="VulnMan App Backend")

# CORS: necesario para que el fetch desde React no se bloquee
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # puerto de Vite en dev
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scans.router, prefix="/scans", tags=["scans"])

@app.get("/health")
def health():
    return {"status": "ok"}