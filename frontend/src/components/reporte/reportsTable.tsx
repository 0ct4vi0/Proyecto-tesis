/* ============================================================
   HAWK'S EYE — components/reportes/ReportsTable.tsx
   ------------------------------------------------------------
   ÍNDICE:
     [T1] Formato de fecha e id
     [T2] Encabezado de la tabla (la última columna es "Fallos")
     [T3] Filas (una por puerto) y mensajes vacíos / error / carga
     [T4] Modal con todos los fallos (CVEs) del puerto elegido
============================================================ */

import { useCallback, useState } from 'react';
import CvesCell from './cvesCell';
import CvesModal from './cvesModal';
import type { ReportRow } from './reportTypes';
import SeverityBadge from './severityBadge';

/* [T1] FORMATO ------------------------------------------------ */

// "2026-10-28T16:05:00-03:00" -> "28/10/2026 16:05"
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// El id es un uuid largo: en la tabla se muestran los primeros 8 caracteres
// (el id completo se ve al pasar el mouse y el filtro acepta cualquier parte).
function shortId(id: string): string {
  return id.slice(0, 8);
}

interface ReportsTableProps {
  rows: ReportRow[];
  loading: boolean;
  error: string;
  hasActiveFilters: boolean;
}

function ReportsTable({ rows, loading, error, hasActiveFilters }: ReportsTableProps) {
  // fila cuyo modal de fallos está abierto (null = ninguno)
  const [cvesRow, setCvesRow] = useState<ReportRow | null>(null);
  const closeCves = useCallback(() => setCvesRow(null), []);

  // mensaje que se muestra cuando no hay filas
  let emptyMessage = '';
  if (loading) emptyMessage = 'Cargando reportes...';
  else if (error) emptyMessage = error;
  else if (rows.length === 0)
    emptyMessage = hasActiveFilters
      ? 'No hay reportes que coincidan con los filtros elegidos.'
      : 'Todavía no tenés escaneos con puertos vulnerables abiertos.';

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          {/* [T2] ENCABEZADO */}
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] font-['Space_Grotesk'] text-[12px] uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-3 font-semibold">Id_Escaneo</th>
              <th className="px-4 py-3 font-semibold">Ip</th>
              <th className="px-4 py-3 font-semibold">Hora</th>
              <th className="px-4 py-3 font-semibold">Puerto</th>
              <th className="px-4 py-3 font-semibold">Servicio</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Fallos</th>
            </tr>
          </thead>

          {/* [T3] FILAS: una por cada puerto vulnerable abierto */}
          <tbody className="font-['IBM_Plex_Mono'] text-[12.5px] text-[var(--text)]">
            {rows.map((row, index) => (
              <tr
                key={`${row.scanId}-${row.port}-${row.protocol}-${index}`}
                className="border-b border-[var(--line)] transition last:border-b-0 hover:bg-[var(--surface-2)]"
              >
                <td className="px-4 py-3 text-[var(--accent)]" title={row.scanId}>
                  {shortId(row.scanId)}
                </td>
                <td className="px-4 py-3">{row.ip}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{formatDate(row.date)}</td>
                <td className="px-4 py-3">
                  {row.port}/{row.protocol}
                </td>
                <td className="px-4 py-3">{row.service}</td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={row.severity} />
                </td>
                <td className="px-4 py-3">
                  <CvesCell cves={row.cves} onShowAll={() => setCvesRow(row)} />
                </td>
              </tr>
            ))}

            {/* mensaje vacío / cargando / error */}
            {emptyMessage && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center font-['Inter'] text-[14px] text-[var(--muted)]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* [T4] MODAL DE FALLOS */}
      <CvesModal row={cvesRow} onClose={closeCves} />
    </>
  );
}

export default ReportsTable;