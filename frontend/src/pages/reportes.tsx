import { useCallback, useEffect, useState } from 'react';
import FilterModal from '../components/reporte/filterModal';
import ReportsTable from '../components/reporte/reportsTable';
import { EMPTY_FILTERS } from '../components/reporte/reportTypes';
import type { ReportFilters, ReportRow } from '../components/reporte/reportTypes';
import { fetchReports } from '../services/reportService';

interface ReportesProps {
  isLoggedIn: boolean;
  onRequireLogin: () => void; // abre el modal de login
  onSessionExpired: () => void; // limpia la sesión si el token venció
}

function Reportes({ isLoggedIn, onRequireLogin, onSessionExpired }: ReportesProps) {
  /* ==========================================================
     [R1] ESTADO Y CARGA DE DATOS
     Cada vez que cambian los filtros aplicados (o se inicia
     sesión) se vuelve a pedir la lista a la API.
  ========================================================== */
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

// Detectar desplazamiento de la página
useEffect(() => {
  const handleScroll = () => {
    setShowBackToTop(window.scrollY > 300);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);

// Volver al inicio suavemente
const scrollToTop = useCallback(() => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setRows([]);
      setTotal(0);
      return;
    }

    let cancelled = false; // evita pisar datos si el usuario cambió los filtros mientras cargaba
    setLoading(true);
    setError('');

    fetchReports(filters)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === 'UNAUTHORIZED') {
          onSessionExpired();
          return;
        }
        setRows([]);
        setError(err.message || 'No se pudieron cargar los reportes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isLoggedIn]);

  /* ==========================================================
     [R2] ACCIONES DE FILTROS
  ========================================================== */
  const closeFilter = useCallback(() => setIsFilterOpen(false), []);

  function applyFilters(next: ReportFilters) {
    setFilters(next);
    setIsFilterOpen(false);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setIsFilterOpen(false);
  }

  // cantidad de filtros activos (se muestra en el botón "Filtrar")
  const activeFilterCount = (filters.scanId !== '' ? 1 : 0) + (filters.severities.length > 0 ? 1 : 0);

  /* ==========================================================
     [R3] SIN SESIÓN: los reportes solo se ven con token activo
  ========================================================== */
  if (!isLoggedIn) {
    return (
      <main className="relative z-[1] mx-auto w-full max-w-[1100px] px-6 pb-12 pt-10">
        <h1 className="mb-1.5 font-['Space_Grotesk'] text-[clamp(24px,3.5vw,34px)] font-semibold text-[var(--text)]">
          Reportes
        </h1>
        <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-center">
          <p className="mb-5 text-[14px] text-[var(--muted)]">Iniciá sesión para ver tus reportes.</p>
          <button
            onClick={onRequireLogin}
            className="rounded-full border border-[var(--accent-dim)] bg-[var(--surface-2)] px-6 py-2.5 text-[13px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_24px_var(--accent-glow)]"
          >
            Iniciar sesión
          </button>
        </div>
      </main>
    );
  }

  /* ==========================================================
     [R4] PANTALLA
  ========================================================== */
  return (
    <main className="relative z-[1] mx-auto w-full max-w-[1100px] px-6 pb-12 pt-10">
      {/* TÍTULO Y BOTÓN "FILTRAR" */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-['Space_Grotesk'] text-[clamp(24px,3.5vw,34px)] font-semibold text-[var(--text)]">
          Reportes
        </h1>

        {/* Si hay filtros activos, muestra cuántos con un numerito ámbar */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[var(--accent-dim)] bg-[var(--surface)] px-5 py-2 text-[13px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_16px_var(--accent-glow)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
          </svg>
          Filtrar
          {activeFilterCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-[#16110A]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* TABLA */}
      <ReportsTable rows={rows} loading={loading} error={error} hasActiveFilters={activeFilterCount > 0} />

      {/* cantidad de filas mostradas */}
      {!loading && !error && (
        <p className="mt-3 text-[12px] text-[var(--muted)]">
          Mostrando {rows.length} de {total} registros
        </p>
      )}

      {/* MODAL "FILTRAR POR:" */}
      <FilterModal
        isOpen={isFilterOpen}
        appliedFilters={filters}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeFilter}
      />

      {/* BOTÓN VOLVER ARRIBA */}
      
      <button
        onClick={scrollToTop}
        aria-label="Volver arriba"
        title="Volver arriba"
        className={`
          fixed bottom-7 right-7 z-[200]
          flex h-12 w-12 items-center justify-center
          rounded-full border border-[var(--accent-dim)]
          bg-[#111416] text-[var(--accent)]
          shadow-[0_0_15px_var(--accent-glow)]
          backdrop-blur-md
          transition-all duration-300
          hover:-translate-y-1
          hover:bg-[var(--accent)]
          hover:text-[#16110A]
          hover:shadow-[0_0_25px_var(--accent-glow)]
          ${
            showBackToTop
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'translate-y-5 opacity-0 pointer-events-none'
          }
        `}
      >
        <span className="text-2xl font-bold leading-none">
          ↑
        </span>
      </button>

    </main>
  );
}

export default Reportes;