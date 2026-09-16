/* ============================================================
   HAWK'S EYE — App.tsx
   ------------------------------------------------------------
   Versión adaptada a un proyecto Vite + React + TypeScript + Tailwind.
   El diseño y el comportamiento son los mismos que en la versión
   HTML/CSS/TS plana, pero acá viven como un componente de React:

     - El layout y casi todos los estilos pasan a clases de Tailwind
       directamente en el JSX (ya no hay style.css).
     - Los colores personalizados de la paleta (fondo, ámbar, etc.)
       se definen como variables CSS en index.css y se consumen con
       la sintaxis de "valor arbitrario" de Tailwind: bg-[var(--bg)].
     - Lo que Tailwind no resuelve con utilidades (la animación de
       barrido del radar, la textura de fondo) vive en App.css.

   El archivo se organiza en los mismos 3 bloques de lógica que
   antes, ahora expresados con hooks de React:

     1. Parálax del header + pupila  -> useRef + useEffect (sin useState,
        porque el valor cambia en cada frame y no queremos re-renderizar
        el componente 60 veces por segundo; se manipula el DOM
        directamente a través de refs, igual que hacía el script.ts original)
     2. Menú lateral escurridizo     -> useState booleano simple
     3. Botón "Iniciar escaneo"      -> useState + useRef (para el id del timeout)
============================================================ */

import { useEffect, useRef, useState } from 'react';
import './App.css';

// Límites de movimiento del header y la pupila, y velocidad de "persecución"
// del header respecto al mouse (mismo comportamiento que el script.ts original)
const HEADER_MAX_OFFSET_X = 14; // px máximos de desplazamiento horizontal del header
const HEADER_MAX_OFFSET_Y = 8;  // px máximos de desplazamiento vertical del header
const PUPIL_MAX_OFFSET = 4;     // px máximos que se mueve la pupila del logo
const LERP_FACTOR = 0.08;       // qué tan "pegado" sigue el header al mouse (0 a 1)

function App() {
  /* ----------------------------------------------------------
     BLOQUE 1: PARÁLAX DEL HEADER
     refs en vez de state: currentPos/targetPos cambian en cada
     frame de la animación, así que actualizarlos con setState
     forzaría un re-render constante e innecesario. Usamos refs
     y tocamos el DOM directo (header.style.transform), igual
     que en la versión sin React.
  ---------------------------------------------------------- */
  const headerRef = useRef<HTMLElement>(null);
  const pupilRef = useRef<HTMLSpanElement>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      // posición relativa del mouse respecto al centro de la ventana:
      // 0 = centro, -0.5 = borde izq/arriba, 0.5 = borde der/abajo
      const relativeX = event.clientX / window.innerWidth - 0.5;
      const relativeY = event.clientY / window.innerHeight - 0.5;

      targetPos.current = {
        x: relativeX * HEADER_MAX_OFFSET_X,
        y: relativeY * HEADER_MAX_OFFSET_Y,
      };

      if (pupilRef.current) {
        pupilRef.current.style.transform = `translate(${relativeX * PUPIL_MAX_OFFSET}px, ${relativeY * PUPIL_MAX_OFFSET}px)`;
      }
    }

    function animateHeader() {
      // interpolación lineal (lerp): acerca la posición actual a la
      // objetivo un poco en cada frame, generando el efecto de inercia
      const current = currentPos.current;
      const target = targetPos.current;
      current.x += (target.x - current.x) * LERP_FACTOR;
      current.y += (target.y - current.y) * LERP_FACTOR;

      if (headerRef.current) {
        headerRef.current.style.transform = `translate(${current.x}px, ${current.y}px)`;
      }
      animationFrameId.current = requestAnimationFrame(animateHeader);
    }

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameId.current = requestAnimationFrame(animateHeader);

    // limpieza: al desmontar el componente se saca el listener y se
    // cancela el loop de animación para no dejar procesos corriendo de más
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  /* ----------------------------------------------------------
     BLOQUE 2: MENÚ LATERAL ESCURRIDIZO
     Acá sí conviene useState: abrir/cerrar el menú es un cambio
     de estado puntual (no continuo como el parálax), y necesitamos
     que React vuelva a renderizar para actualizar las clases de
     Tailwind del panel, la pestaña y el overlay.
  ---------------------------------------------------------- */
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function toggleMenu() {
    setIsMenuOpen((prev) => !prev);
  }

  /* ----------------------------------------------------------
     BLOQUE 3: BOTÓN "INICIAR ESCANEO"
     isScanning controla tanto el texto/estado visual como el
     bloqueo de clics repetidos. scanTimeoutRef guarda el id del
     setTimeout para poder cancelarlo si el componente se
     desmonta a mitad de un escaneo (evita actualizar estado de
     un componente que ya no existe).
  ---------------------------------------------------------- */
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  // CAMBIO: se eliminó scanTimeoutRef — ya no hay setTimeout que cancelar,
  // ahora el ciclo de vida de la petición lo maneja el fetch (then/catch)

  function handleScanClick() {
    if (isScanning) return; // evita disparar varios escaneos superpuestos

    setIsScanning(true);
    setScanStatus('Escaneando objetivo…');

    // CAMBIO: se reemplaza el setTimeout simulado por un fetch real
    // al backend de FastAPI (POST /scans/start). La UI se mantiene igual
    // (isScanning / scanStatus), solo cambia de dónde viene el resultado.
    fetch('http://127.0.0.1:8000/scans/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: '192.168.1.0/24' }), // TODO: reemplazar por un valor real/dinámico más adelante
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Respuesta no OK: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // CAMBIO: antes esto era fijo ("Escaneo finalizado..."), ahora
        // refleja lo que efectivamente devolvió el backend
        setIsScanning(false);
        setScanStatus(`Backend confirmó: ${data.status} (${data.network})`);
      })
      .catch((err) => {
        // CAMBIO: nuevo — antes no existía manejo de error porque
        // el setTimeout nunca podía fallar
        console.error('Error al conectar con el backend:', err);
        setIsScanning(false);
        setScanStatus('Error al conectar con el backend');
      });
  }

// CAMBIO: se eliminó el useEffect de cleanup del setTimeout —
// ya no aplica porque no hay timeout pendiente que cancelar al desmontar


  return (
    <>
      {/* ================= HEADER: marca a la izquierda, redes a la derecha ================= */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 z-[100] flex w-full items-center justify-between px-10 py-[22px] will-change-transform after:absolute after:bottom-[-14px] after:left-10 after:right-10 after:h-px after:bg-gradient-to-r after:from-[var(--line)] after:to-transparent"
      >
        {/* marca "Hawk's Eye": tamaño chico a propósito, con un ojo
            decorativo cuya pupila sigue levemente al mouse */}
        <div className="flex select-none items-center gap-2.5 font-['Space_Grotesk'] text-[17px] font-semibold text-[var(--text)]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[var(--accent-dim)]">
            <span
              ref={pupilRef}
              className="h-[7px] w-[7px] rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)] transition-transform duration-100"
            />
          </span>
          Hawk's<span className="text-[var(--accent)]">Eye</span>
        </div>

        {/* redes sociales: chicas pero legibles */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            aria-label="X / Twitter"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
              <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.4 22H1.3l8.2-9.4L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
            </svg>
          </a>
          <a
            href="#"
            aria-label="LinkedIn"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--accent-dim)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.55 4.78 5.86V21h-4v-5.8c0-1.38-.02-3.15-1.92-3.15-1.93 0-2.22 1.5-2.22 3.05V21h-4V9Z" />
            </svg>
          </a>
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
      </header>

      {/* ================= HERO CENTRAL: botón "Iniciar escaneo" ================= */}
      <main className="relative z-[1] flex min-h-screen flex-col items-center justify-center gap-[34px] px-6 text-center">
        <div>
          <h1 className="mb-2.5 font-['Space_Grotesk'] text-[clamp(26px,4vw,40px)] font-semibold text-[var(--text)]">
            Vigilancia constante de tu superficie de ataque
          </h1>
          <p className="mx-auto max-w-[46ch] text-[15px] text-[var(--muted)]">
            Hawk's Eye rastrea puertos, servicios y credenciales expuestas antes de que alguien más lo haga.
          </p>
        </div>

        {/* anillos concéntricos + botón. El barrido de radar (::before
            en la versión CSS) ahora es un div que solo se renderiza
            mientras isScanning es true */}
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          <div className="absolute h-full w-full rounded-full border border-[var(--line)]" />
          <div className="absolute h-[72%] w-[72%] rounded-full border border-[var(--line)]" />
          <div className="absolute h-[44%] w-[44%] rounded-full border border-[var(--accent-dim)]" />

          {isScanning && (
            <div className="absolute inset-0 animate-[sweep_1.4s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--accent-glow),transparent_30%)]" />
          )}

          <button
            onClick={handleScanClick}
            className="relative z-[2] rounded-full border border-[var(--accent-dim)] bg-[var(--surface)] px-[30px] py-[15px] text-sm font-semibold tracking-wide text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[#16110A] hover:shadow-[0_0_24px_var(--accent-glow)] active:scale-[0.97]"
          >
            {isScanning ? 'Escaneando…' : 'Iniciar escaneo'}
          </button>
        </div>

        {/* readout de estado: min-height fija evita que el layout salte
            cuando el texto aparece */}
        <div
          className={`min-h-[16px] font-['IBM_Plex_Mono'] text-[12.5px] ${
            scanStatus ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
          }`}
        >
          {scanStatus}
        </div>
      </main>

      {/* ================= MENÚ LATERAL ESCURRIDIZO ================= */}

      {/* fondo oscuro: solo capta clics (pointer-events-auto) cuando el
          menú está abierto; si está cerrado, deja pasar los clics */}
      <div
        onClick={toggleMenu}
        className={`fixed inset-0 z-[104] bg-black/35 transition-opacity duration-300 ${
          isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* pestaña disparadora: se corre 260px hacia la izquierda al
          abrirse, "acompañando" el borde del panel */}
      <div
        onClick={toggleMenu}
        role="button"
        aria-label="Abrir menú"
        className={`fixed top-1/2 z-[110] flex h-[78px] w-[34px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-[10px] border border-r-0 border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-[right,color,background-color] duration-300 hover:bg-[var(--surface-2)] hover:text-[var(--accent)] ${
          isMenuOpen ? 'right-[260px]' : 'right-0'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={`h-[15px] w-[15px] transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      {/* panel deslizante: translate-x-full lo esconde fuera de pantalla,
          translate-x-0 lo trae a la vista */}
      <aside
        className={`fixed right-0 top-0 z-[105] h-full w-[260px] border-l border-[var(--line)] bg-[var(--surface)] px-[26px] pb-[26px] pt-[90px] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,0.9,0.32,1)] ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h2 className="mb-5 font-['Space_Grotesk'] text-[13px] font-semibold tracking-wide text-[var(--muted)]">
          Menú
        </h2>
        <nav className="flex flex-col gap-1">
          {['Inicio', 'Escaneos', 'Alertas', 'Reportes', 'Configuración'].map((item) => (
            <a
              key={item}
              href="#"
              className="rounded-lg border border-transparent px-2.5 py-[11px] text-sm font-medium text-[var(--text)] transition hover:border-[var(--line)] hover:bg-[var(--surface-2)] hover:pl-4 hover:text-[var(--accent)]"
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default App;