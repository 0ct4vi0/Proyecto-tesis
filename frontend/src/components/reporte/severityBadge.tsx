/* ============================================================
   HAWK'S EYE — components/reportes/SeverityBadge.tsx
   Etiqueta de color con el estado (Crítico / Alto / Medio / Bajo).
============================================================ */

import type { Severity } from './reportTypes';
import { SEVERITY_OPTIONS, SEVERITY_STYLES, SEVERITY_UNKNOWN_STYLE } from './severity';

interface SeverityBadgeProps {
  severity: Severity | null;
}

function SeverityBadge({ severity }: SeverityBadgeProps) {
  const style = severity ? SEVERITY_STYLES[severity] : SEVERITY_UNKNOWN_STYLE;
  const label = severity ? SEVERITY_OPTIONS.find((o) => o.value === severity)?.label : 'Sin dato';

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 font-['Inter'] text-[12px] font-medium ${style}`}
    >
      {label}
    </span>
  );
}

export default SeverityBadge;