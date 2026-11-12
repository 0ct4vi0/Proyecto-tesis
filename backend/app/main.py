from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.reports.router import router as reports_router
from modules import auth, scans
from modules.account.router  import router as account_router
app = FastAPI(title="VulnMan App Backend")

# CORS: necesario para que el fetch desde React no se bloquee
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # puerto de Vite en dev
    allow_methods=["*"],
    allow_headers=["*"],  # incluye Authorization
)

app.include_router(reports_router)

app.include_router(account_router)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(scans.router, prefix="/scans", tags=["scans"])


@app.get("/health")
def health():
    return {"status": "ok"}