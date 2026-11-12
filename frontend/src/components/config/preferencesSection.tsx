import { useState, type SyntheticEvent } from "react";
import { updatePreferences, type AccountSettings } from "../../services/accountService";
import Feedback from "./feedback";
import { inputClass, labelClass, primaryButtonClass } from "./fieldStyle";
import SettingsCard from "./settingsCard";
import { useSave } from "./useSave";

interface Props {
  settings: AccountSettings;
  onChange: (next: AccountSettings) => void;
  onSessionExpired: () => void;
}

function PreferencesSection({ settings, onChange, onSessionExpired }: Props) {
  const [correo, setCorreo] = useState(settings.correo_reporte ?? "");
  const [avisar, setAvisar] = useState(settings.avisar_sin_hallazgos);
  const { saving, error, ok, run } = useSave(onSessionExpired);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const updated = await run(
      () => updatePreferences(correo.trim() || null, avisar),
      "Preferencias guardadas",
    );
    if (updated) {
      setCorreo(updated.correo_reporte ?? "");
      onChange(updated);
    }
  }

  const unchanged =
    (correo.trim() || null) === settings.correo_reporte && avisar === settings.avisar_sin_hallazgos;

  return (
    <SettingsCard
      title="Preferencias de escaneo"
      description="Cómo querés recibir los reportes de tus escaneos."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="cfg-correo-reporte" className={labelClass}>Correo alternativo para el reporte</label>
          <input id="cfg-correo-reporte" type="email" className={inputClass} value={correo}
            placeholder={`Vacío = ${settings.email}`} onChange={(e) => setCorreo(e.target.value)} />
          <p className="mt-1.5 text-[12px] text-[var(--muted)]">
            Si lo dejás vacío, el reporte llega al correo de tu cuenta.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-[var(--text)]">Avisar si no hay hallazgos</p>
            <p className="text-[12px] text-[var(--muted)]">
              Recibís un mail cuando un escaneo no encuentra vulnerabilidades activas.
            </p>
          </div>
          <button type="button" role="switch" aria-checked={avisar} onClick={() => setAvisar((v) => !v)}
            className={"relative h-6 w-11 shrink-0 rounded-full transition-colors " +
              (avisar ? "bg-[var(--accent,#f97316)]" : "bg-white/20")}>
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " +
              (avisar ? "left-[22px]" : "left-0.5")} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className={primaryButtonClass} disabled={saving || unchanged}>
            {saving ? "Guardando…" : "Guardar preferencias"}
          </button>
          <Feedback error={error} ok={ok} />
        </div>
      </form>
    </SettingsCard>
  );
}

export default PreferencesSection;