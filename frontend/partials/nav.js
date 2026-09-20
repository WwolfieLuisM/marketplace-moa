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

  function marcarActivo() {
    const archivo = location.pathname.split('/').pop() || 'feed.html';
    const activo = activoPorPagina[archivo] || null;
    mount.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.nav === activo);
    });
  }

  function init() {
    if (mount.querySelector('.mobile-nav')) {
      marcarActivo();
      return;
    }
    mount.addEventListener('partialloaded', function cargar() {
      marcarActivo();
    }, { once: true });
  }

  init();
})();