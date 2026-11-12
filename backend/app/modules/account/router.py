from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from modules.auth.db import get_conn
from modules.auth.security import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/account", tags=["account"])


# ============================================================
# [A1] MODELOS DE ENTRADA
# ============================================================
class ProfileIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    apellido: str = Field(min_length=1, max_length=80)


class PasswordIn(BaseModel):
    # None si la cuenta todavía no tiene contraseña (entra solo con Google)
    actual: str | None = Field(default=None, max_length=128)
    nueva: str = Field(min_length=8, max_length=128)


class PreferencesIn(BaseModel):
    correo_reporte: EmailStr | None = None  # None = usar el correo de la cuenta
    avisar_sin_hallazgos: bool


class DeleteIn(BaseModel):
    email: str  # confirmación: tiene que coincidir con el correo de la cuenta


# ============================================================
# [A2] UTILIDADES
# ============================================================
_SELECT_USER = """
    SELECT nombre, apellido, email, password_hash, google_sub,
           correo_reporte, avisar_sin_hallazgos
    FROM usuarios WHERE id = %s::uuid
"""


def _settings_from_row(row: dict) -> dict:
    return {
        "nombre": row["nombre"],
        "apellido": row["apellido"],
        "email": row["email"],
        "tiene_password": bool(row["password_hash"]),
        "google_vinculado": row["google_sub"] is not None,
        "correo_reporte": row["correo_reporte"],
        "avisar_sin_hallazgos": row["avisar_sin_hallazgos"],
    }


def _load_user(conn, user_id: str) -> dict:
    row = conn.execute(_SELECT_USER, (user_id,)).fetchone()
    if row is None:
        raise HTTPException(401, "El usuario ya no existe")
    return row


# ============================================================
# [A3] GET /account/settings
# ============================================================
@router.get("/settings")
def get_settings(current: dict = Depends(get_current_user)):
    with get_conn() as conn:
        return _settings_from_row(_load_user(conn, current["id"]))


# ============================================================
# [A4] PATCH /account/profile
# ============================================================
@router.patch("/profile")
def update_profile(payload: ProfileIn, current: dict = Depends(get_current_user)):
    nombre = payload.nombre.strip()
    apellido = payload.apellido.strip()
    if not nombre or not apellido:
        raise HTTPException(422, "El nombre y el apellido no pueden estar vacíos")

    with get_conn() as conn:
        _load_user(conn, current["id"])
        conn.execute(
            "UPDATE usuarios SET nombre = %s, apellido = %s WHERE id = %s::uuid",
            (nombre, apellido, current["id"]),
        )
        return _settings_from_row(_load_user(conn, current["id"]))


# ============================================================
# [A5] POST /account/password
# Error de contraseña actual = 400 (no 401) para que el front no
# lo confunda con una sesión vencida.
# ============================================================
@router.post("/password")
def change_password(payload: PasswordIn, current: dict = Depends(get_current_user)):
    with get_conn() as conn:
        user = _load_user(conn, current["id"])

        if user["password_hash"]:
            if not payload.actual or not verify_password(user["password_hash"], payload.actual):
                raise HTTPException(400, "La contraseña actual es incorrecta")

        conn.execute(
            "UPDATE usuarios SET password_hash = %s WHERE id = %s::uuid",
            (hash_password(payload.nueva), current["id"]),
        )
    return {"ok": True}


# ============================================================
# [A6] PUT /account/preferences
# ============================================================
@router.put("/preferences")
def update_preferences(payload: PreferencesIn, current: dict = Depends(get_current_user)):
    correo = payload.correo_reporte.lower() if payload.correo_reporte else None

    with get_conn() as conn:
        _load_user(conn, current["id"])
        conn.execute(
            """
            UPDATE usuarios
            SET correo_reporte = %s, avisar_sin_hallazgos = %s
            WHERE id = %s::uuid
            """,
            (correo, payload.avisar_sin_hallazgos, current["id"]),
        )
        return _settings_from_row(_load_user(conn, current["id"]))


# ============================================================
# [A7] DELETE /account
# Borra los puertos, los escaneos y el usuario, en ese orden y en
# una sola transacción (si algo falla no se borra nada).
# Así NO hace falta ON DELETE CASCADE en la base.
# ============================================================
@router.delete("")
def delete_account(payload: DeleteIn, current: dict = Depends(get_current_user)):
    with get_conn() as conn:
        user = _load_user(conn, current["id"])
        if payload.email.strip().lower() != user["email"].lower():
            raise HTTPException(400, "El correo ingresado no coincide con el de tu cuenta")

        conn.execute(
            """
            DELETE FROM puertos_escaneo
            WHERE scan_id IN (SELECT scan_id FROM escaneos WHERE usuario_id = %s::uuid)
            """,
            (current["id"],),
        )
        conn.execute("DELETE FROM escaneos WHERE usuario_id = %s::uuid", (current["id"],))
        conn.execute("DELETE FROM usuarios WHERE id = %s::uuid", (current["id"],))
    return {"ok": True}