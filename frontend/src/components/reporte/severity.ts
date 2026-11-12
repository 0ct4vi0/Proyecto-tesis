/* ============================================================
   HAWK'S EYE — components/reportes/severity.ts
   Opciones y colores de la severidad ("Estado").
   Para cambiar nombres o colores, se toca SOLO este archivo.
============================================================ */

import type { Severity } from './reportTypes';

// Opciones del desplegable (el orden es el que se muestra)
export const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'critico', label: 'Crítico' },
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Medio' },
  { value: 'bajo', label: 'Bajo' },
];

// Colores de la etiqueta de estado en la tabla
export const SEVERITY_STYLES: Record<Severity, string> = {
  critico: 'border-red-500/50 bg-red-500/10 text-red-400',
  alto: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  medio: 'border-[var(--accent-dim)] bg-[var(--accent)]/10 text-[var(--accent)]',
  bajo: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
};

// Estilo para un valor que no reconocemos
export const SEVERITY_UNKNOWN_STYLE = 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]';