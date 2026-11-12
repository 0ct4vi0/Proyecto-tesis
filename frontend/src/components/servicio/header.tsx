
import { useParallax } from '../../hooks/useParallax';

interface HeaderProps {
  userEmail: string | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({
  userEmail,
  onLogin,
  onLogout,
}: HeaderProps) {
  const { headerRef, pupilRef } = useParallax();

  return (
    <header
      ref={headerRef}
     className="top-0 left-0 z-[100] flex w-full items-center justify-between px-10 py-[22px] will-change-transform"
    >
      {/* Logo */}
      <a
        href="#"
        aria-label="Ir al inicio"
        className="flex select-none items-center gap-2.5 font-['Space_Grotesk'] text-[17px] font-semibold text-[var(--text)]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[var(--accent-dim)]">
          <span
            ref={pupilRef}
            className="h-[7px] w-[7px] rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)] transition-transform duration-100"
          />
        </span>

        Hawk's<span className="text-[var(--accent)]">Eye</span>
      </a>

      {/* Login y redes */}
      <div className="flex items-center gap-6">

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden max-w-[180px] truncate font-['IBM_Plex_Mono'] text-[12px] text-[var(--muted)] sm:block">
              {userEmail}
            </span>
          )}

          <button
            onClick={userEmail ? onLogout : onLogin}
            className="rounded-full border border-[var(--accent-dim)] px-4 py-1.5 text-[13px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_16px_var(--accent-glow)]"
          >
            {userEmail ? 'Cerrar sesión' : 'Iniciar sesión'}
          </button>
        </div>

        {/* Redes sociales */}
        <div className="flex items-center gap-4">

          {/* X */}
          <a
            href="#"
            aria-label="X / Twitter"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
              <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.4 22H1.3l8.2-9.4L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="#"
            aria-label="LinkedIn"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.55 4.78 5.86V21h-4v-5.8c0-1.38-.02-3.15-1.92-3.15-1.93 0-2.22 1.5-2.22 3.05V21h-4V9Z" />
            </svg>
          </a>

          {/* GitHub */}
          <a
            href="#"
            aria-label="GitHub"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
              <path d="M12 2a10 10 0 0 0-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.93 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.9-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.83-2.35 4.68-4.58 4.92.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
          </a>

        </div>
      </div>
    </header>
  );
}
