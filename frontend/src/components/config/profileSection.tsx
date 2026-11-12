import { useState, type SyntheticEvent } from "react";
import { updateProfile, type AccountSettings } from "../../services/accountService";
import Feedback from "./feedback";
import { inputClass, labelClass, primaryButtonClass } from "./fieldStyle";
import SettingsCard from "./settingsCard";
import { useSave } from "./useSave";

interface Props {
  settings: AccountSettings;
  onChange: (next: AccountSettings) => void;
  onSessionExpired: () => void;
}

function ProfileSection({ settings, onChange, onSessionExpired }: Props) {
  const [nombre, setNombre] = useState(settings.nombre);
  const [apellido, setApellido] = useState(settings.apellido);
  const { saving, error, ok, run } = useSave(onSessionExpired);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const updated = await run(() => updateProfile(nombre.trim(), apellido.trim()), "Perfil actualizado");
    if (updated) {
      setNombre(updated.nombre);
      setApellido(updated.apellido);
      onChange(updated);
    }
  }

  const unchanged = nombre.trim() === settings.nombre && apellido.trim() === settings.apellido;
  const empty = !nombre.trim() || !apellido.trim();

  return (
    <SettingsCard title="Perfil" description="Tus datos personales dentro de Hawk's Eye.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cfg-nombre" className={labelClass}>Nombre</label>
            <input id="cfg-nombre" className={inputClass} value={nombre} maxLength={80}
              onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cfg-apellido" className={labelClass}>Apellido</label>
            <input id="cfg-apellido" className={inputClass} value={apellido} maxLength={80}
              onChange={(e) => setApellido(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="cfg-email" className={labelClass}>Correo de la cuenta</label>
          <input id="cfg-email" className={inputClass} value={settings.email} disabled readOnly />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className={primaryButtonClass} disabled={saving || unchanged || empty}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Feedback error={error} ok={ok} />
        </div>
      </form>
    </SettingsCard>
  );
}

export default ProfileSection;