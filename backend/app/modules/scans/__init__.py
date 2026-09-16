# Reexportamos router.py para que "from modules import scans" y luego
# "scans.router" sigan funcionando igual que cuando scans era un solo archivo.
from .router import router