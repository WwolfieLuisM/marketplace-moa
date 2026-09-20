(function initMoaNav() {
  const mount = document.querySelector('#nav-mount');
  if (!mount) return;

  const activoPorPagina = {
    'feed.html': 'inicio',
    'feed-guest.html': 'inicio',
    'favoritos.html': 'guardados',
    'publicacion-nueva.html': 'publicar',
    'mensajes.html': 'mensajes',
    'perfil.html': 'perfil',
    'vendedor-perfil.html': 'perfil',
    'solicitud.html': 'perfil',
  };

  const PROTEGIDOS = new Set(['guardados', 'publicar', 'mensajes', 'perfil']);

  function marcarActivo() {
    const archivo = location.pathname.split('/').pop() || 'feed.html';
    const activo = activoPorPagina[archivo] || null;
    mount.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.nav === activo);
    });
  }

  function gatearInvitado() {
    mount.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item');
      if (!item || currentUser) return;
      if (PROTEGIDOS.has(item.dataset.nav)) {
        e.preventDefault();
        if (window.openAuth) openAuth();
      }
    });
  }

  function init() {
    const bind = async () => {
      await esperarSesion();
      marcarActivo();
      gatearInvitado();
    };
    if (mount.querySelector('.mobile-nav')) { void bind(); return; }
    mount.addEventListener('partialloaded', function cargar() {
      void bind();
    }, { once: true });
  }

  init();
})();