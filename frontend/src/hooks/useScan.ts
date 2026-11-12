import { useEffect, useRef, useState } from 'react';

import {
  startScanRequest,
  getScanStatus,
} from '../services/scanService';

const POLL_INTERVAL_MS = 5000;

// El escaneo activo se guarda para poder retomarlo si el usuario sale de
// la página (se desmonta Inicio) o recarga el navegador.
const STORAGE_KEY = 'hawkseye_active_scan';

function readStoredScanId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeScanId(scanId: string | null) {
  try {
    if (scanId) localStorage.setItem(STORAGE_KEY, scanId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin localStorage: el escaneo sigue, pero no se puede retomar */
  }
}

export function useScan(onUnauthorized?: () => void, isLoggedIn = true) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  // Escaneo iniciado desde esta pantalla (para distinguirlo de uno retomado)
  const startedHereRef = useRef<string | null>(null);

  async function startScan(network: string) {
    if (isScanning) return;

    setIsScanning(true);
    setScanStatus('Escaneando objetivo…');

    try {
      const data = await startScanRequest(network);

      startedHereRef.current = data.scan_id;
      storeScanId(data.scan_id);
      setActiveScanId(data.scan_id);

      setScanStatus(
        `Escaneo en curso · orden: ${data.scan_id}`
      );
    } catch (error) {
      setIsScanning(false);

      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        setScanStatus('Tu sesión venció. Iniciá sesión de nuevo.');
        onUnauthorized?.();
        return;
      }

      console.error('Error al conectar con el backend:', error);
      setScanStatus('Error al conectar con el backend');
    }
  }

  // Retomar un escaneo en curso al volver a la página.
  // Sin sesión se limpia el estado visual, pero el escaneo guardado se conserva:
  // si el mismo usuario vuelve a entrar, se retoma; si es otro, el backend
  // responde 404 y se descarta en silencio.
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveScanId(null);
      setIsScanning(false);
      setScanStatus('');
      return;
    }

    const storedId = readStoredScanId();
    if (!storedId) return;

    setActiveScanId(storedId);
    setIsScanning(true);
    setScanStatus(`Escaneo en curso · orden: ${storedId}`);
  }, [isLoggedIn]);

  // Seguimiento del escaneo activo (consulta inmediata y luego cada 5 s)
  useEffect(() => {
    if (!activeScanId) return;

    let isActive = true;

    function finishScan(message: string) {
      if (!isActive) return;

      storeScanId(null);
      setActiveScanId(null);
      setIsScanning(false);
      setScanStatus(message);
    }

    async function check() {
      try {
        const data = await getScanStatus(activeScanId as string);

        if (!isActive) return;

        if (data.status === 'completed') {
          finishScan(
            'Escaneo finalizado. Revisá tu correo para ver el reporte.'
          );
        } else if (data.status === 'failed') {
          finishScan('El escaneo no pudo completarse');
        } else if (data.status === 'timeout') {
          finishScan(
            'El escaneo tardó demasiado y se dejó de seguir'
          );
        }
      } catch (error) {
        if (!isActive) return;

        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
          // No se borra el escaneo guardado: al volver a iniciar sesión se retoma
          setActiveScanId(null);
          setIsScanning(false);
          setScanStatus('Tu sesión venció. Iniciá sesión de nuevo.');
          onUnauthorized?.();
          return;
        }

        if (
          error instanceof Error &&
          error.message === 'SCAN_NOT_FOUND'
        ) {
          // Si lo iniciaste acá es un aviso; si era uno retomado
          // (de otro usuario o previo a un reinicio) se descarta en silencio.
          finishScan(
            startedHereRef.current === activeScanId
              ? 'Se perdió el seguimiento del escaneo (el backend se reinició)'
              : ''
          );
        }

        // Los errores momentáneos se reintentan
        // en el próximo ciclo.
      }
    }

    void check();
    const intervalId = window.setInterval(check, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeScanId]);

  return {
    isScanning,
    scanStatus,
    startScan,
  };
}