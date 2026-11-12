import { getToken } from "./authService";

const API_URL = "http://127.0.0.1:8000";

export interface AccountSettings {
  nombre: string;
  apellido: string;
  email: string;
  tiene_password: boolean;
  google_vinculado: boolean;
  correo_reporte: string | null;
  avisar_sin_hallazgos: boolean;
}

export class AccountError extends Error {
  status: number;
  code?: "UNAUTHORIZED";
  constructor(message: string, status: number, code?: "UNAUTHORIZED") {
    super(message);
    this.name = "AccountError";
    this.status = status;
    this.code = code;
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof AccountError && err.code === "UNAUTHORIZED";
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = getToken();
  if (!token) throw new AccountError("Sesión no iniciada", 401, "UNAUTHORIZED");

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError("No se pudo conectar con el servidor", 0);
  }

  if (res.status === 401) throw new AccountError("Sesión vencida", 401, "UNAUTHORIZED");

  if (!res.ok) {
    let message = "Ocurrió un error inesperado";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (res.status === 422) message = "Revisá los datos ingresados";
    } catch {
      /* respuesta sin JSON */
    }
    throw new AccountError(message, res.status);
  }

  return (await res.json()) as T;
}

export const getSettings = () => request<AccountSettings>("/account/settings", "GET");

export const updateProfile = (nombre: string, apellido: string) =>
  request<AccountSettings>("/account/profile", "PATCH", { nombre, apellido });

export const changePassword = (actual: string | null, nueva: string) =>
  request<{ ok: boolean }>("/account/password", "POST", { actual, nueva });

export const updatePreferences = (correo_reporte: string | null, avisar_sin_hallazgos: boolean) =>
  request<AccountSettings>("/account/preferences", "PUT", { correo_reporte, avisar_sin_hallazgos });

export const deleteAccount = (email: string) =>
  request<{ ok: boolean }>("/account", "DELETE", { email });