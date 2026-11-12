
interface IpInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  disabled: boolean;
}

const IPV4_REGEX =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

export default function IpInput({
  value,
  onChange,
  onEnter,
  disabled,
}: IpInputProps) {
  const trimmedIp = value.trim();

  const isIpValid = IPV4_REGEX.test(trimmedIp);

  const showIpError =
    trimmedIp.length > 0 && !isIpValid;

  return (
    <div className="relative w-full max-w-[320px]">

      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onEnter();
          }
        }}
        disabled={disabled}
        placeholder="Ingresá la IP (ej: 192.168.1.10)"
        aria-label="Dirección IP a escanear"
        aria-invalid={showIpError}
        className={`w-full rounded-full border bg-[var(--surface)] px-5 py-3 text-center font-['IBM_Plex_Mono'] text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:shadow-[0_0_16px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 ${
          showIpError
            ? 'border-red-500/70 focus:border-red-500'
            : 'border-[var(--line)] focus:border-[var(--accent-dim)]'
        }`}
      />

      <div className="absolute left-0 right-0 top-full mt-1.5 text-center text-[12px] text-red-400">
        {showIpError && 'IPv4 no válida (ej: 192.168.1.10)'}
      </div>

    </div>
  );
}
