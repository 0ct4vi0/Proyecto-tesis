/* ============================================================
   HAWK'S EYE — components/reportes/reportTypes.ts
   Tipos compartidos de la pantalla Reportes.
============================================================ */

export type Severity = 'critico' | 'alto' | 'medio' | 'bajo';

// Una fila de la tabla = un puerto de un escaneo
export interface ReportRow {
  scanId: string;
  ip: string;
  date: string; // ISO que manda el backend; se formatea al mostrarla
  cves: string[]; // lista vacía = sin CVEs
  port: number;
  protocol: string;
  service: string;
  cvss: number | null;
  severity: Severity | null; // null = la BD tiene un valor que no reconocemos
}

// Respuesta de GET /reports
export interface ReportsResponse {
  total: number; // cantidad total de registros del usuario (sin filtros)
  rows: ReportRow[];
}

// Filtros que se pueden aplicar
export interface ReportFilters {
  scanId: string;
  severities: Severity[];
}

export const EMPTY_FILTERS: ReportFilters = { scanId: '', severities: [] };