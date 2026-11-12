import psycopg
from psycopg.rows import dict_row
 
from modules.config import DATABASE_URL
 
 
def get_conn() -> psycopg.Connection:
    """Una conexión por operación (suficiente para el prototipo)."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)