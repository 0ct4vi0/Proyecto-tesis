import { useState, type SyntheticEvent } from "react";
import { changePassword, type AccountSettings } from "../../services/accountService";
import Feedback from "./feedback";
import { inputClass, labelClass, primaryButtonClass } from "./fieldStyle";
import SettingsCard from "./settingsCard";
import { useSave } from "./useSave";

interface Props {
  settings: AccountSettings;
  onChange: (next: AccountSettings) => void;
  onSessionExpired: () => void;
}

function PasswordSection({ settings, onChange, onSessionExpired }: Props) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { saving, error, ok, run, reset } = useSave(onSessionExpired);

  const creating = !settings.tiene_password;

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    reset();
    if (nueva.length < 8) return setLocalError("La nueva contraseña debe tener al menos 8 caracteres");
    if (nueva !== repetir) return setLocalError("Las contraseñas nuevas no coinciden");
    setLocalError(null);

    const result = await run(
      () => changePassword(creating ? null : actual, nueva),
      creating ? "Contraseña creada" : "Contraseña actualizada",
    );
    if (result) {
      setActual("");
      setNueva("");
      setRepetir("");
      if (creating) onChange({ ...settings, tiene_password: true });
    }
  }

  return (
    <SettingsCard
      title={creating ? "Crear contraseña" : "Cambiar contraseña"}
      description={
        creating
          ? "Tu cuenta entra con Google. Podés crear una contraseña para ingresar también con tu correo."
          : "Ingresá tu contraseña actual y elegí una nueva (mínimo 8 caracteres)."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!creating && (
          <div>
            <label htmlFor="cfg-pass-actual" className={labelClass}>Contraseña actual</label>
            <input id="cfg-pass-actual" type="password" autoComplete="current-password"
              className={inputClass} value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cfg-pass-nueva" className={labelClass}>Nueva contraseña</label>
            <input id="cfg-pass-nueva" type="password" autoComplete="new-password"
              className={inputClass} value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cfg-pass-repetir" className={labelClass}>Repetir nueva contraseña</label>
            <input id="cfg-pass-repetir" type="password" autoComplete="new-password"
              className={inputClass} value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className={primaryButtonClass}
            disabled={saving || !nueva || !repetir || (!creating && !actual)}>
            {saving ? "Guardando…" : creating ? "Crear contraseña" : "Cambiar contraseña"}
          </button>
          <Feedback error={localError ?? error} ok={ok} />
        </div>
      </form>
    </SettingsCard>
  );
}

export default PasswordSection;