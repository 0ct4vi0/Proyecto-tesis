const API_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'hawkseye_token';

export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

async function post(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = 'No se pudo completar la solicitud';
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') detail = data.detail;
    } catch { /* sin cuerpo JSON */ }
    throw new AuthError(detail, response.status);
  }

  const data: AuthResponse = await response.json();
  saveToken(data.token);
  return data;
}

export const login = (email: string, password: string) =>
  post('/auth/login', { email, password });

export const register = (
  nombre: string, apellido: string, email: string, password: string
) => post('/auth/register', { nombre, apellido, email, password });

// Revisá el nombre del campo en /auth/google (en /docs) si da 422
export const loginWithGoogle = (credential: string) =>
  post('/auth/google', { credential });

// Devuelve el usuario si el token guardado sigue siendo válido
export async function getMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    clearToken();
    return null;
  }

  const data = await response.json();
  return data.user ?? data;
}