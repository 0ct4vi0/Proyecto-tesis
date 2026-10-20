Diagrama del proyecto: 
--------------------------------------------------------------------------

### INICIALIZACION DE LOS PROGRAMAS 

Para iniciar la aplicacion se debe ejecutar en el front:

    npm run dev -> http://localhost:5173/

Para inicializar el backend: 
    
    source .venv/Scripts/activate  (desde la raiz del proyecto)

Para ejecutar el backend, app/ donde se encuentra el main:

    uvicorn main:app --reload

Para levantar los compose

    -cd carpeta que de la app

    -docker compose up -d para inicializar el compos

    -docker compose down para apagarlo



### DATOS DEL PROYECTO

Sistema objetivo:
    Metasploitable 3

Segundo objetivo:
    Windows 11

Servidor OpenVAS:
    IP: https://127.0.0.1/
        -Usuario: admin
        -Contraseña: 12345

N8N:
    IP/URL: http://localhost:5678/

PostgreSQL:
    Base de datos: vulnerability_scanner

Red:
    Rango: 192.168.100.0/24

Nmap:
    Ejecutado desde Ubuntu/WSL

OpenVAS:
    Escaneo general inicial realizado


## COMANDOS PRIMERAS PRUEBAS DE NMAP

    -sV: detección de servicios y versiones.
    -sS: escaneo TCP SYN
    -sn: escaneo rapido omitiendo puertos.
    -O: detección del sistema operativo.
    -A: activa detección del sistema operativo, versiones traceroute y scripts básicos.
    -T: acelera el escaneo sin ser demasiado agresivo dependiendo de la velocidad elegida (1 al 5).

    comandos: 
        - nmap -sV -T4 192.168.100.25
        - nmap -sn 192.168.100.25
        - sudo nmap -sS -sV 192.168.100.25

        

