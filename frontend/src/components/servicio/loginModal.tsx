import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { AuthError, login, loginWithGoogle } from '../../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Tipo del resultado de login (el que devuelva authService.login)
export type LoginResult = Awaited<ReturnType<typeof login>>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (result: LoginResult) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const loginEmailRef = useRef<HTMLInputElement>(null);

  // Enfocar el email cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      loginEmailRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Limpiar contraseña y errores al cerrar
  function handleClose() {
    setLoginPassword('');
    setLoginErrors({});
    setSubmitError(null);
    onClose();
  }

  // Validar e iniciar sesión contra el backend
  async function handleLogin(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const errors: {
      email?: string;
      password?: string;
    } = {};

    const trimmedEmail = loginEmail.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Ingresá un email válido';
    }

    if (loginPassword.length === 0) {
      errors.password = 'Ingresá tu contraseña';
    }

    setLoginErrors(errors);
    setSubmitError(null);

    if (errors.email || errors.password) return;

    setIsSubmitting(true);

    try {
      const result = await login(trimmedEmail, loginPassword);

      onLogin(result);
      handleClose();
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : 'No se pudo conectar con el servidor. Intentá de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Iniciar sesión con Google (el backend crea la cuenta si todavía no existe)
  async function handleGoogleSuccess(credential: string | undefined) {
    if (isSubmitting) return;

    if (!credential) {
      setSubmitError('Google no devolvió una credencial válida.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithGoogle(credential);

      onLogin(result);
      handleClose();
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : 'No se pudo conectar con el servidor. Intentá de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      onClick={handleClose}
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-[opacity,visibility] duration-300 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-[380px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-3 scale-95'
        }`}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Título */}
        <h2
          id="login-title"
          className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[var(--text)]"
        >
          Iniciar sesión
        </h2>

        <p className="mb-6 text-[13px] text-[var(--muted)]">
          Ingresá con tu cuenta para asociar los registros de tus escaneos.
        </p>

        {/* Formulario */}
        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
            >
              Email
            </label>

            <input
              id="login-email"
              ref={loginEmailRef}
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="tu@email.com"
              aria-invalid={Boolean(loginErrors.email)}
              className={`w-full rounded-lg border bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:shadow-[0_0_14px_var(--accent-glow)] ${
                loginErrors.email
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-[var(--line)] focus:border-[var(--accent-dim)]'
              }`}
            />

            {loginErrors.email && (
              <p className="mt-1 text-[12px] text-red-400">{loginErrors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
            >
              Contraseña
            </label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="••••••••"
              aria-invalid={Boolean(loginErrors.password)}
              className={`w-full rounded-lg border bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:shadow-[0_0_14px_var(--accent-glow)] ${
                loginErrors.password
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-[var(--line)] focus:border-[var(--accent-dim)]'
              }`}
            />

            {loginErrors.password && (
              <p className="mt-1 text-[12px] text-red-400">{loginErrors.password}</p>
            )}
          </div>

          {/* Error del servidor (sirve para el login normal y para Google) */}
          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400"
            >
              {submitError}
            </p>
          )}

          {/* Enviar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full border border-[var(--accent-dim)] bg-[var(--surface-2)] px-6 py-3 text-sm font-semibold tracking-wide text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_24px_var(--accent-glow)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>

          {/* Enlace a registro */}
          <div className="mt-1 flex justify-center">
            <a
              href="#registro"
              onClick={handleClose}
              className="text-[13px] font-medium text-[var(--accent)] transition hover:underline"
            >
              Registrarse
            </a>
          </div>
        </form>

        {/* Separador */}
        <div className="my-5 flex items-center gap-3 text-[12px] text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          o
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        {/* Google */}
        <div className="flex justify-center">
          {GOOGLE_CLIENT_ID ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={(response) => handleGoogleSuccess(response.credential)}
                onError={() => setSubmitError('No se pudo iniciar sesión con Google.')}
                theme="filled_black"
                shape="pill"
                text="signin_with"
              />
            </GoogleOAuthProvider>
          ) : (
            <p className="text-center text-[12px] text-[var(--muted)]">
              Login con Google no disponible: falta VITE_GOOGLE_CLIENT_ID en frontend/.env
            </p>
          )}
        </div>
      </div>
    </div>
  );
}