/* ============================================================
   HAWK'S EYE — components/reportes/SeverityDropdown.tsx
   Desplegable de "Estado" con selección múltiple.
   Si se hace clic afuera, se cierra solo.
   (open / onOpenChange los maneja FilterModal para que la
   tecla Esc cierre primero el desplegable y después el modal.)
============================================================ */

import { useEffect, useRef } from 'react';
import type { Severity } from './reportTypes';
import { SEVERITY_OPTIONS } from './severity';

interface SeverityDropdownProps {
  selected: Severity[];
  onToggle: (value: Severity) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SeverityDropdown({ selected, onToggle, open, onOpenChange }: SeverityDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clic fuera del desplegable: lo cierra
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [open, onOpenChange]);

  return (
    <div ref={dropdownRef} className="relative">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]">Estado</span>

      {/* barra que abre/cierra la lista; muestra lo elegido */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-lg border bg-[var(--bg)] px-3.5 py-2.5 text-left text-[13px] outline-none transition ${
          open
            ? 'border-[var(--accent-dim)] shadow-[0_0_14px_var(--accent-glow)]'
            : 'border-[var(--line)] hover:border-[var(--accent-dim)]'
        }`}
      >
        <span className={selected.length > 0 ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
          {selected.length > 0
            ? SEVERITY_OPTIONS.filter((o) => selected.includes(o.value))
                .map((o) => o.label)
                .join(', ')
            : 'Seleccionar estados'}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* lista: Crítico / Alto / Medio / Bajo (se pueden tildar varios) */}
      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-2)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {SEVERITY_OPTIONS.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => onToggle(option.value)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] text-[var(--text)] transition hover:bg-[var(--surface)]"
                >
                  {/* casillero tildable */}
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                      checked
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#16110A]'
                        : 'border-[var(--line)]'
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    )}
                  </span>
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SeverityDropdown;