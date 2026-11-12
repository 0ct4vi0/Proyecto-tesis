
interface RadarProps {
  isScanning: boolean;
  disabled: boolean;
  onStart: () => void;
}

export default function Radar({
  isScanning,
  disabled,
  onStart,
}: RadarProps) {
  return (
    <div className="relative -mt-2 flex h-[220px] w-[220px] items-center justify-center">

      {/* Anillo exterior */}
      <div className="absolute h-full w-full rounded-full border border-[var(--line)]" />

      {/* Anillo intermedio */}
      <div className="absolute h-[72%] w-[72%] rounded-full border border-[var(--line)]" />

      {/* Anillo interior */}
      <div className="absolute h-[44%] w-[44%] rounded-full border border-[var(--accent-dim)]" />

      {/* Barrido giratorio */}
      {isScanning && (
        <div className="absolute inset-0 animate-[sweep_1.4s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--accent-glow),transparent_30%)]" />
      )}

      {/* Botón */}
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="relative z-[2] rounded-full border border-[var(--accent-dim)] bg-[var(--surface)] px-[30px] py-[15px] text-sm font-semibold tracking-wide text-[var(--accent)] transition enabled:hover:bg-[var(--accent)] enabled:hover:text-[#16110A] enabled:hover:shadow-[0_0_24px_var(--accent-glow)] enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isScanning ? 'Escaneando…' : 'Iniciar escaneo'}
      </button>

    </div>
  );
}
