
import { useCallback, useEffect, useState } from "react";
import DeleteAccountSection from "../components/config/deleteAcountSection";
import PasswordSection from "../components/config/passwordSection";
import PreferencesSection from "../components/config/preferencesSection";
import ProfileSection from "../components/config/profileSection";
import { getSettings, isUnauthorized, type AccountSettings } from "../services/accountService";
// [C1] Props
interface Props {
  isLoggedIn: boolean;
  onSessionExpired: () => void;
  // Opcional: para refrescar el nombre en el estado de App cuando se edita el perfil
  onProfileUpdated?: (nombre: string, apellido: string) => void;
}

function Configuracion({ isLoggedIn, onSessionExpired, onProfileUpdated }: Props) {
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // [C2] Carga
  useEffect(() => {
    if (!isLoggedIn) {
      setSettings(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    getSettings()
      .then((data) => !cancelled && setSettings(data))
      .catch((err) => {
        if (cancelled) return;
        if (isUnauthorized(err)) onSessionExpired();
        else setLoadError(err instanceof Error ? err.message : "No se pudo cargar la configuración");
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, onSessionExpired]);

  const handleChange = useCallback(
    (next: AccountSettings) => {
      setSettings(next);
      onProfileUpdated?.(next.nombre, next.apellido);
    },
    [onProfileUpdated],
  );

  // [C3] Render
  return (
    <main className="relative z-[1] mx-auto w-full max-w-[1100px] px-6 pb-12 pt-10">
      <h1 className="mb-1.5 font-['Space_Grotesk'] text-[clamp(24px,3.5vw,34px)] font-semibold text-[var(--text)]">
        Configuración
      </h1>

      {!isLoggedIn && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--card,rgba(255,255,255,0.03))] px-6 py-8 text-center"
        >
          <p className="text-[15px] font-medium text-[var(--text)]">
            Iniciá sesión para acceder a las configuraciones
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Desde acá vas a poder editar tu perfil, tu contraseña y tus preferencias de escaneo.
          </p>
        </div>
      )}
      {isLoggedIn && loadError && <p className="text-[14px] text-red-400">{loadError}</p>}
      {isLoggedIn && !loadError && !settings && (
        <p className="text-[14px] text-[var(--muted)]">Cargando…</p>
      )}

      {isLoggedIn && settings && (
        <div className="mt-6 flex flex-col gap-6">
          <ProfileSection settings={settings} onChange={handleChange} onSessionExpired={onSessionExpired} />
          <PasswordSection settings={settings} onChange={handleChange} onSessionExpired={onSessionExpired} />
          <PreferencesSection settings={settings} onChange={handleChange} onSessionExpired={onSessionExpired} />
          <DeleteAccountSection email={settings.email} onSessionExpired={onSessionExpired} />
        </div>
      )}
    </main>
  );
}

export default Configuracion;