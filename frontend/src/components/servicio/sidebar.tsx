
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Inicio', href: '#' },
  { label: 'Reportes', href: '#reportes' },
  { label: 'Configuración', href: '#configuracion' },
];

export default function Sidebar({
  isOpen,
  onToggle,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Fondo oscuro */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[104] bg-black/35 transition-opacity duration-300 ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Pestaña disparadora */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
        className={`fixed top-1/2 z-[110] flex h-[78px] w-[34px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-[10px] border border-r-0 border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-[right,color,background-color] duration-300 hover:bg-[var(--surface-2)] hover:text-[var(--accent)] ${
          isOpen ? 'right-[260px]' : 'right-0'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={`h-[15px] w-[15px] transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Panel lateral */}
      <aside
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-[105] h-full w-[260px] border-l border-[var(--line)] bg-[var(--surface)] px-[26px] pb-[26px] pt-[90px] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,0.9,0.32,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h2 className="mb-5 font-['Space_Grotesk'] text-[13px] font-semibold tracking-wide text-[var(--muted)]">
          Menú
        </h2>

        <nav className="flex flex-col gap-1">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
              className="rounded-lg border border-transparent px-2.5 py-[11px] text-sm font-medium text-[var(--text)] transition hover:border-[var(--line)] hover:bg-[var(--surface-2)] hover:pl-4 hover:text-[var(--accent)]"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
