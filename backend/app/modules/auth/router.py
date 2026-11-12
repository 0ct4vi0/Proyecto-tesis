import psycopg
from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, EmailStr, Field

from modules.config import GOOGLE_CLIENT_ID

from .db import get_conn
from .security import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()


class RegisterIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    apellido: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleIn(BaseModel):
    credential: str  # id_token que entrega Google Identity Services en el front


def _session(user: dict) -> dict:
    uid = str(user["id"])
    return {
        "token": create_token(uid, user["email"]),
        "user": {
            "id": uid,
            "nombre": user["nombre"],
            "apellido": user["apellido"],
            "email": user["email"],
        },
    }


@router.post("/register", status_code=201)
def register(payload: RegisterIn):
    email = payload.email.lower()
    try:
        with get_conn() as conn:
            user = conn.execute(
                """
                INSERT INTO usuarios (nombre, apellido, email, password_hash)
                VALUES (%s, %s, %s, %s)
                RETURNING id, nombre, apellido, email
                """,
                (
                    payload.nombre.strip(),
                    payload.apellido.strip(),
                    email,
                    hash_password(payload.password),
                ),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Ese email ya está registrado")
    return _session(user)


@router.post("/login")
def login(payload: LoginIn):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT id, nombre, apellido, email, password_hash FROM usuarios WHERE email = %s",
            (payload.email.lower(),),
        ).fetchone()

    if (
        user is None
        or not user["password_hash"]
        or not verify_password(user["password_hash"], payload.password)
    ):
        raise HTTPException(401, "Credenciales inválidas")
    return _session(user)


@router.post("/google")
def google_login(payload: GoogleIn):
    """Sirve tanto para registrarse como para iniciar sesión con Google."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Login con Google no configurado")
    try:
        info = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(401, "Token de Google inválido")

    if not info.get("email_verified"):
        raise HTTPException(401, "El email de Google no está verificado")

    email = info["email"].lower()
    sub = info["sub"]

    with get_conn() as conn:
        user = conn.execute(
            """
            SELECT id, nombre, apellido, email, google_sub
            FROM usuarios WHERE google_sub = %s OR email = %s
            """,
            (sub, email),
        ).fetchone()

        if user is None:
            user = conn.execute(
                """
                INSERT INTO usuarios (nombre, apellido, email, google_sub)
                VALUES (%s, %s, %s, %s)
                RETURNING id, nombre, apellido, email
                """,
                (info.get("given_name") or "-", info.get("family_name") or "-", email, sub),
            ).fetchone()
        elif user["google_sub"] is None:
            # Cuenta creada con contraseña: se vincula a Google (el email ya está verificado)
            conn.execute(
                "UPDATE usuarios SET google_sub = %s WHERE id = %s", (sub, user["id"])
            )
    return _session(user)


@router.get("/me")
def me(current: dict = Depends(get_current_user)):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT id, nombre, apellido, email FROM usuarios WHERE id = %s",
            (current["id"],),
        ).fetchone()
    if user is None:
        raise HTTPException(401, "El usuario ya no existe")
    return {
        "id": str(user["id"]),
        "nombre": user["nombre"],
        "apellido": user["apellido"],
        "email": user["email"],
    }