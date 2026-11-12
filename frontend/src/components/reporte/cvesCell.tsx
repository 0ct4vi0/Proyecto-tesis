interface CvesCellProps {
  cves: string[];
  onShowAll: () => void; // abre el modal con todos los CVEs
}

function CvesCell({ cves, onShowAll }: CvesCellProps) {
  // sin CVEs
  if (cves.length === 0) return <span className="text-[var(--muted)]">—</span>;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span>{cves[0]}</span>

      {/* botón "+": solo aparece si hay más de un CVE */}
      {cves.length > 1 && (
        <button
          type="button"
          onClick={onShowAll}
          title={`Ver los ${cves.length} fallos`}
          aria-label={`Ver los ${cves.length} fallos detectados`}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-orange-500 text-white transition hover:bg-orange-400 hover:shadow-[0_0_10px_rgba(249,115,22,0.6)] active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="h-3 w-3">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default CvesCell;