import os

from dotenv import load_dotenv

# Carga app/.env (el archivo está junto a modules/)
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")