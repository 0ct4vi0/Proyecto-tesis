import { useState, type SyntheticEvent } from "react";
import { clearToken } from "../../services/authService";
import { deleteAccount } from "../../services/accountService";
import Feedback from "./feedback";
import { dangerButtonClass, inputClass, labelClass } from "./fieldStyle";
import SettingsCard from "./settingsCard";
import { useSave } from "./useSave";

interface Props {
  email: string;
  onSessionExpired: () => void;
}

function DeleteAccountSection({ email, onSessionExpired }: Props) {
  const [confirmacion, setConfirmacion] = useState("");
  const { saving, error, run } = useSave(onSessionExpired);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const result = await run(() => deleteAccount(confirmacion.trim()), "Cuenta eliminada");
    if (result) {
      clearToken();
      onSessionExpired(); // vuelve a inicio y pide login
    }
  }

  const matches = confirmacion.trim().toLowerCase() === email.toLowerCase();

  return (
    <SettingsCard
      danger
      title="Eliminar cuenta"
      description="Se borran tu usuario, tus escaneos y todos tus reportes. Esta acción no se puede deshacer."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="cfg-delete-email" className={labelClass}>
            Escribí tu correo (<span className="text-[var(--text)]">{email}</span>) para confirmar
          </label>
          <input id="cfg-delete-email" type="email" className={inputClass} value={confirmacion}
            autoComplete="off" onChange={(e) => setConfirmacion(e.target.value)} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className={dangerButtonClass} disabled={saving || !matches}>
            {saving ? "Eliminando…" : "Eliminar mi cuenta"}
          </button>
          <Feedback error={error} ok={null} />
        </div>
      </form>
    </SettingsCard>
  );
}

export default DeleteAccountSection;