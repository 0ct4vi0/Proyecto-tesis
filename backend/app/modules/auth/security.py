from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from modules.config import JWT_EXPIRE_HOURS, JWT_SECRET

ALGORITHM = "HS256"
_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Dependencia: exige 'Authorization: Bearer <token>' y devuelve {id, email}."""
    headers = {"WWW-Authenticate": "Bearer"}
    if creds is None:
        raise HTTPException(401, "Necesitás iniciar sesión", headers=headers)
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Tu sesión expiró", headers=headers)
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido", headers=headers)
    return {"id": data["sub"], "email": data["email"]}