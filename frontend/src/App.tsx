import { useEffect, useState } from 'react';

import './App.css';

import Header from './components/servicio/header';
import Sidebar from './components/servicio/sidebar';
import LoginModal from './components/servicio/loginModal';

import Inicio from './pages/inicio';
import Reportes from './pages/reportes';
import Configuracion from './pages/configuracion';
import Registro from './pages/registro';

import { clearToken, getMe, type AuthUser } from './services/authService';

function App() {
  // Estado del menú lateral
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estado del modal de login
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Usuario con sesión iniciada
  const [user, setUser] = useState<AuthUser | null>(null);

  // true cuando ya se intentó restaurar la sesión guardada
  const [authReady, setAuthReady] = useState(false);

  const userEmail = user?.email ?? null;

  // Ruta actual
  const [route, setRoute] = useState(() =>
    window.location.hash.replace('#', '')
  );

  // Restaurar la sesión si hay un token guardado y sigue siendo válido
  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((me) => {
        if (!cancelled && me) setUser(me);
      })
      .catch(() => {
        // Backend apagado o sin red: se queda sin sesión (el token se conserva)
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Escuchar cambios en la URL
  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash.replace('#', ''));

      window.scrollTo(0, 0);

      setIsMenuOpen(false);
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Determinar qué página mostrar
  const page =
    route === 'reportes' ||
    route === 'configuracion' ||
    route === 'registro'
      ? route
      : 'inicio';

  // Si ya hay sesión, el registro no tiene sentido: volver al inicio
  useEffect(() => {
    if (authReady && user && page === 'registro') {
      window.location.hash = '';
    }
  }, [authReady, user, page]);

  // Abrir y cerrar menú
  function toggleMenu() {
    setIsMenuOpen((previous) => !previous);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  // Abrir y cerrar login
  function openLogin() {
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  // Login o registro exitoso (authService ya guardó el token)
  function handleAuthenticated(result: { user: AuthUser }) {
    setUser(result.user);
    setIsLoginOpen(false);

    if (page === 'registro') {
      window.location.hash = '';
    }
  }

  // Cerrar sesión
  function handleLogout() {
    clearToken();
    setUser(null);
  }

  // Token vencido o inválido: se limpia la sesión y se pide login
  function handleSessionExpired() {
    clearToken();
    setUser(null);
    setIsLoginOpen(true);
  }

  return (
    <>
      {/* HEADER */}
      <Header
        userEmail={userEmail}
        onLogin={openLogin}
        onLogout={handleLogout}
      />

      {/* PÁGINAS */}
      {page === 'inicio' && (
        <Inicio
          isLoggedIn={userEmail !== null}
          onRequireLogin={openLogin}
          onSessionExpired={handleSessionExpired}
        />
      )}

      {page === 'registro' && (
        <Registro
          onRegistered={handleAuthenticated}
          onRequestLogin={() => {
            window.location.hash = '';
            setIsLoginOpen(true);
          }}
        />
      )}

      {page === 'reportes' && (
        <Reportes
          isLoggedIn={userEmail !== null}
          onRequireLogin={openLogin}
          onSessionExpired={handleSessionExpired}
        />
      )}

      {page === 'configuracion' && (
        <Configuracion
          isLoggedIn={userEmail !== null}
          onSessionExpired={handleSessionExpired}
          onProfileUpdated={(nombre, apellido) =>
            setUser((u) => (u ? { ...u, nombre, apellido } : u))
          }
        />
      )}

      {/* MENÚ LATERAL */}
      <Sidebar
        isOpen={isMenuOpen}
        onToggle={toggleMenu}
        onClose={closeMenu}
      />

      {/* MODAL LOGIN */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLogin}
        onLogin={handleAuthenticated}
      />
    </>
  );
}

export default App;