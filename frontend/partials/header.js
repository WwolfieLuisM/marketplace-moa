(function initMoaHeader() {
  const mount = document.querySelector('#header-mount');
  if (!mount) return;

  const iconPlus = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const iconMsg = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 5.5H17V13H8.5L5 16.5V13H3V5.5Z"/></svg>';
  const iconUser = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><circle cx="10" cy="6.5" r="3"/><path d="M4.5 17c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke-linecap="round"/></svg>';
  const iconAdmin = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z"/></svg>';

  function render() {
    const actions = mount.querySelector('#headerActions');
    if (!actions) return;

    let html;
    if (!currentUser) {
      html =
        '<a href="login.html" class="btn-ghost">Iniciar sesión</a>' +
        '<a href="registro.html" class="btn-cta">Crear cuenta</a>';
    } else if (currentUser.rol === 'admin') {
      html =
        '<a href="admin.html" class="icon-circle" aria-label="Panel de administración">' + iconAdmin + '</a>' +
        '<a href="perfil.html" class="icon-circle" aria-label="Mi perfil">' + iconUser + '</a>';
    } else {
      html =
        '<a href="publicacion-nueva.html" class="publish-btn">' + iconPlus + 'Publicar</a>' +
        '<a href="mensajes.html" class="icon-circle" aria-label="Mensajes"><div class="dot"></div>' + iconMsg + '</a>' +
        '<a href="perfil.html" class="icon-circle" aria-label="Mi perfil">' + iconUser + '</a>';
    }
    actions.innerHTML = html;
  }

  async function init() {
    if (mount.querySelector('.header')) {
      await esperarSesion();
      render();
      return;
    }
    mount.addEventListener('partialloaded', async function cargar() {
      await esperarSesion();
      render();
    }, { once: true });
  }

  init();
})();