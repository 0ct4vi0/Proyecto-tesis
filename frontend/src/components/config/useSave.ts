import { useCallback, useState } from "react";
import { isUnauthorized } from "../../services/accountService";

export function useSave(onSessionExpired: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setOk(null);
  }, []);

  // Devuelve el resultado de la acción, o null si falló.
  const run = useCallback(
    async <T,>(action: () => Promise<T>, okMessage: string): Promise<T | null> => {
      setSaving(true);
      setError(null);
      setOk(null);
      try {
        const result = await action();
        setOk(okMessage);
        return result;
      } catch (err) {
        if (isUnauthorized(err)) {
          onSessionExpired();
        } else {
          setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
        }
        return null;
      } finally {
        setSaving(false);
      }
    },
    [onSessionExpired],
  );

  return { saving, error, ok, run, reset };
}