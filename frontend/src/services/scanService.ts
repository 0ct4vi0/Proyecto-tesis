import { getToken } from './authService';

const API_URL = 'http://127.0.0.1:8000';

interface StartScanResponse {
  scan_id: string;
}

interface ScanStatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startScanRequest(
  network: string
): Promise<StartScanResponse> {
  const response = await fetch(`${API_URL}/scans/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ network }),
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error(`Respuesta no OK: ${response.status}`);

  return response.json();
}

export async function getScanStatus(
  scanId: string
): Promise<ScanStatusResponse> {
  const response = await fetch(
    `${API_URL}/scans/${encodeURIComponent(scanId)}`,
    { headers: authHeaders() }
  );

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (response.status === 404) throw new Error('SCAN_NOT_FOUND');
  if (!response.ok) throw new Error(`Respuesta no OK: ${response.status}`);

  return response.json();
}