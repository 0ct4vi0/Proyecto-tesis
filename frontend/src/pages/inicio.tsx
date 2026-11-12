import { useState } from 'react';

import IpInput from '../components/servicio/ipInput';
import Radar from '../components/servicio/radar';

import { useScan } from '../hooks/useScan';

const IPV4_REGEX =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

interface InicioProps {
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  onSessionExpired: () => void;
}

export default function Inicio({
  isLoggedIn,
  onRequireLogin,
  onSessionExpired,
}: InicioProps) {
  const [targetIp, setTargetIp] = useState('');

  const {
    isScanning,
    scanStatus,
    startScan,
  } = useScan(onSessionExpired, isLoggedIn);

  const trimmedIp = targetIp.trim();

  const isIpValid = IPV4_REGEX.test(trimmedIp);

  function handleScanClick() {
    if (isScanning || !isIpValid) return;

    // Sin sesión: se abre el modal de login en vez de escanear
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    startScan(trimmedIp);
  }

  return (
    <main className="relative z-[1] flex min-h-screen flex-col items-center justify-center gap-[34px] px-6 pb-12 pt-28 text-center">

      {/* Título y descripción */}
      <div>
        <h1 className="mb-2.5 font-['Space_Grotesk'] text-[clamp(26px,4vw,40px)] font-semibold text-[var(--text)]">
          Vigilancia constante de tu superficie de ataque
        </h1>

        <p className="mx-auto max-w-[46ch] text-[15px] text-[var(--muted)]">
          Hawk's Eye rastrea puertos, servicios y credenciales expuestas antes de que alguien más lo haga.
        </p>
      </div>

      {/* Campo de IP */}
      <IpInput
        value={targetIp}
        onChange={setTargetIp}
        onEnter={handleScanClick}
        disabled={isScanning}
      />

      {/* Radar */}
      <div
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            handleScanClick();
          }
        }}
      >
        <Radar
          isScanning={isScanning}
          disabled={!isIpValid || isScanning}
          onStart={handleScanClick}
        />
      </div>

      {/* Estado del escaneo */}
      <div
        aria-live="polite"
        className={`min-h-[16px] font-['IBM_Plex_Mono'] text-[12.5px] ${
          scanStatus
            ? 'text-[var(--accent)]'
            : 'text-[var(--muted)]'
        }`}
      >
        {scanStatus}
      </div>

    </main>
  );
}