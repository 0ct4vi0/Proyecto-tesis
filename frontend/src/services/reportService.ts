
import { getToken } from './authService';
import type { ReportFilters, ReportsResponse } from '../components/reporte/reportTypes';

// Misma URL que usa authService
const API_URL = 'http://127.0.0.1:8000';

export async function fetchReports(filters: ReportFilters): Promise<ReportsResponse> {
  const token = getToken();
  if (!token) throw new Error('UNAUTHORIZED');

  const params = new URLSearchParams();
  if (filters.scanId) params.set('scan_id', filters.scanId);
  filters.severities.forEach((s) => params.append('severidad', s));

  const query = params.toString();
  const response = await fetch(`${API_URL}/reports${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('No se pudieron cargar los reportes.');

  return (await response.json()) as ReportsResponse;
}