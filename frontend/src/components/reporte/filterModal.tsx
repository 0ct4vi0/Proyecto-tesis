import { useEffect, useState } from 'react';
import type { ReportFilters, Severity } from './reportTypes';
import SeverityDropdown from './severityDropdown';

interface FilterModalProps {
  isOpen: boolean;
  appliedFilters: ReportFilters; // lo que está aplicado hoy (para arrancar con eso)
  onApply: (filters: ReportFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterModal({ isOpen, appliedFilters, onApply, onClear, onClose }: FilterModalProps) {
  /* [F1] LÓGICA ------------------------------------------------ */
  const [draftScanId, setDraftScanId] = useState('');
  const [draftSeverities, setDraftSeverities] = useState<Severity[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Al abrir el modal, arranca con los filtros que ya están aplicados
  useEffect(() => {
    if (!isOpen) return;
    setDraftScanId(appliedFilters.scanId);
    setDraftSeverities(appliedFilters.severities);
    setIsDropdownOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Tecla Esc: cierra el desplegable primero y después el modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (isDropdownOpen) setIsDropdownOpen(false);
      else onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDropdownOpen, onClose]);

  function toggleSeverity(value: Severity) {
    setDraftSeverities((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  function handleApply() {
    onApply({ scanId: draftScanId.trim(), severities: draftSeverities });
  }

  return (
    /* [F2] FONDO OSCURO: siempre en el DOM pero oculto hasta abrir.
       Se cierra con la X, Esc o un clic en el fondo. */
    <div
      onClick={onClose}
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-[opacity,visibility] duration-300 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {/* tarjeta (stopPropagation: un clic adentro no cierra el modal) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[400px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-3 scale-95'
        }`}
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

        <h2 id="filter-title" className="mb-6 font-['Space_Grotesk'] text-[22px] font-semibold text-[var(--text)]">
          Filtrar por:
        </h2>

        <div className="flex flex-col gap-5">
          {/* [F3] ID DE ESCANEO: acepta cualquier parte del id */}
          <div>
            <label htmlFor="filter-scan-id" className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">
              Id_escaneo
            </label>
            <input
              id="filter-scan-id"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={draftScanId}
              onChange={(e) => setDraftScanId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
              placeholder="Ej: 3f9a1c2e"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 font-['IBM_Plex_Mono'] text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent-dim)] focus:shadow-[0_0_14px_var(--accent-glow)]"
            />
          </div>

          {/* [F4] ESTADO */}
          <SeverityDropdown
            selected={draftSeverities}
            onToggle={toggleSeverity}
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
          />
        </div>

        {/* [F5] BOTONES */}
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-4 py-2.5 text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-full border border-[var(--accent-dim)] bg-[var(--surface-2)] px-6 py-2.5 text-[13px] font-semibold tracking-wide text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_24px_var(--accent-glow)] active:scale-[0.98]"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterModal;