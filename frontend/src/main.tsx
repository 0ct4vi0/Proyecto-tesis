/* ============================================================
   main.tsx
   ------------------------------------------------------------
   Punto de entrada de la aplicación. Monta el componente raíz
   (App) dentro del <div id="root"> que ya existe en index.html,
   envuelto en StrictMode para que React avise en desarrollo si
   detecta patrones riesgosos (efectos con side-effects no
   limpiados, renders duplicados, etc.).

   Ya no existe un index.css separado: las directivas de Tailwind,
   la paleta de colores y los estilos globales viven todos en
   App.css, que se importa una sola vez desde App.tsx. Por eso acá
   no hace falta ningún import de estilos.
============================================================ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);