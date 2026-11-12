/* ============================================================
   HAWK'S EYE — components/reportes/CvesModal.tsx
   Modal con todos los CVEs (fallos) de un puerto.
   Arriba dice "Cantidad de vulnerabilidades detectadas: N".
   Se cierra con la X, Esc o un clic en el fondo.
   Si row es null, el modal no se muestra.
============================================================ */

import { useEffect } from 'react';
import type { ReportRow } from './reportTypes';

interface CvesModalProps {
  row: ReportRow | null;
  onClose: () => void;
}

function CvesModal({ row, onClose }: CvesModalProps) {
  // Tecla Esc: cierra el modal
  useEffect(() => {
    if (!row) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [row, onClose]);

  if (!row) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      {/* tarjeta (stopPropagation: un clic adentro no cierra el modal) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cves-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
      >
        {/* botón X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* título con la cantidad */}
        <h2 id="cves-title" className="mb-1 pr-8 font-['Space_Grotesk'] text-[20px] font-semibold text-[var(--text)]">
          Cantidad de vulnerabilidades detectadas:{' '}
          <span className="text-orange-400">{row.cves.length}</span>
        </h2>

        {/* a qué puerto corresponden */}
        <p className="mb-5 font-['IBM_Plex_Mono'] text-[12.5px] text-[var(--muted)]">
          {row.ip} · {row.port}/{row.protocol} · {row.service}
        </p>

        {/* lista de CVEs (con scroll si son muchos) */}
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <ul className="grid grid-cols-2 gap-2 font-['IBM_Plex_Mono'] text-[12.5px] text-[var(--text)]">
            {row.cves.map((cve) => (
              <li
                key={cve}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
              >
                {cve}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CvesModal;