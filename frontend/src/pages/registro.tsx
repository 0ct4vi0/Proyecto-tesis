import { useState } from 'react';
import {
  AuthError,
  loginWithGoogle,
  register,
} from '../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Tipo del resultado (el que devuelva authService.register)
export type RegisterResult = Awaited<ReturnType<typeof register>>;

interface RegistroProps {
  // Se llama cuando el registro (normal o con Google) fue exitoso
  onRegistered: (result: RegisterResult) => void;
  // Abre el modal de inicio de sesión
  onRequestLogin: () => void;
}

interface FormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
}

const inputBase =
  'w-full rounded-lg border bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:shadow-[0_0_14px_var(--accent-glow)]';

function inputClass(hasError: boolean) {
  return `${inputBase} ${
    hasError
      ? 'border-red-500/70 focus:border-red-500'
      : 'border-[var(--line)] focus:border-[var(--accent-dim)]'
  }`;
}

export default function Registro({
  onRegistered,
  onRequestLogin,
}: RegistroProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(error: unknown) {
    return error instanceof AuthError
      ? error.message
      : 'No se pudo conectar con el servidor. Intentá de nuevo.';
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const newErrors: FormErrors = {};
    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNombre) newErrors.nombre = 'Ingresá tu nombre';
    if (!trimmedApellido) newErrors.apellido = 'Ingresá tu apellido';
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Ingresá un email válido';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
    }

    setErrors(newErrors);
    setSubmitError(null);

    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await register(
        trimmedNombre,
        trimmedApellido,
        trimmedEmail,
        password
      );

      onRegistered(result);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential: string | undefined) {
    if (!credential) {
      setSubmitError('Google no devolvió una credencial válida.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithGoogle(credential);

      onRegistered(result);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-12 pt-28">
      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">

        <h1 className="mb-1 font-['Space_Grotesk'] text-[24px] font-semibold text-[var(--text)]">
          Crear cuenta
        </h1>

        <p className="mb-6 text-[13px] text-[var(--muted)]">
          Registrate para iniciar escaneos y recibir los reportes en tu correo.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="registro-nombre"
                className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
              >
                Nombre
              </label>
              <input
                id="registro-nombre"
                type="text"
                autoComplete="given-name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                aria-invalid={Boolean(errors.nombre)}
                className={inputClass(Boolean(errors.nombre))}
              />
              {errors.nombre && (
                <p className="mt-1 text-[12px] text-red-400">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="registro-apellido"
                className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
              >
                Apellido
              </label>
              <input
                id="registro-apellido"
                type="text"
                autoComplete="family-name"
                value={apellido}
                onChange={(event) => setApellido(event.target.value)}
                aria-invalid={Boolean(errors.apellido)}
                className={inputClass(Boolean(errors.apellido))}
              />
              {errors.apellido && (
                <p className="mt-1 text-[12px] text-red-400">{errors.apellido}</p>
              )}
            </div>
          </div>

          {/* Correo */}
          <div>
            <label
              htmlFor="registro-email"
              className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
            >
              Correo
            </label>
            <input
              id="registro-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              aria-invalid={Boolean(errors.email)}
              className={inputClass(Boolean(errors.email))}
            />
            {errors.email && (
              <p className="mt-1 text-[12px] text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="registro-password"
              className="mb-1.5 block text-[12px] font-medium text-[var(--muted)]"
            >
              Contraseña
            </label>
            <input
              id="registro-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              aria-invalid={Boolean(errors.password)}
              className={inputClass(Boolean(errors.password))}
            />
            {errors.password && (
              <p className="mt-1 text-[12px] text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Error del servidor */}
          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-full border border-[var(--accent-dim)] bg-[var(--surface-2)] px-6 py-3 text-sm font-semibold tracking-wide text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_24px_var(--accent-glow)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>

        {/* Ya tengo cuenta */}
        <p className="mt-6 text-center text-[13px] text-[var(--muted)]">
          ¿Ya tenés cuenta?{' '}
          <button
            type="button"
            onClick={onRequestLogin}
            className="font-medium text-[var(--accent)] transition hover:underline"
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </main>
  );
}