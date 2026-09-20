// ui.js — helpers de render del marketplace (usa `api`, `currentUser` globales de api.js)

const GOOGLE_CLIENT_ID = '687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com';

let guestModalEl = null;
let googlePanelLock = false;

function cargarGsiPanel() {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function entrarConGoogle() {
  if (googlePanelLock) return;
  googlePanelLock = true;
  const btn = guestModalEl && guestModalEl.querySelector('.panel-google');
  if (btn) btn.disabled = true;
  try {
    const listo = await cargarGsiPanel();
    const g = listo && window.google && window.google.accounts && window.google.accounts.id;
    if (!g) { googlePanelLock = false; if (btn) btn.disabled = false; location.href = 'login.html'; return; }
    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        googlePanelLock = false;
        if (btn) btn.disabled = false;
        if (!resp || !resp.credential) return;
        try {
          const data = await api.post('/auth/google', { idToken: resp.credential });
          if (data && data.user) location.href = 'feed.html';
        } catch (err) {
          window.alert(err.message || 'No se pudo iniciar sesión con Google');
        }
      },
    });
    g.prompt(() => { googlePanelLock = false; if (btn) btn.disabled = false; });
  } catch (e) {
    googlePanelLock = false;
    if (btn) btn.disabled = false;
    location.href = 'login.html';
  }
}

function crearPanelBienvenida() {
  if (guestModalEl) return;
  guestModalEl = document.createElement('div');
  guestModalEl.className = 'overlay';
  guestModalEl.hidden = true;
  guestModalEl.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
    '<div class="sheet-body center">' +
    '<div class="brand-mark" style="margin-bottom:6px"><span class="m1">moa</span><span class="m2">mercado</span></div>' +
    '<h2 id="authTitle" style="font-size:21px;margin:0 0 6px">Únete al mercado de Moa</h2>' +
    '<p style="font-size:14px;color:var(--ink-soft);line-height:1.5">Para ver teléfonos, guardar favoritos, publicar y chatear necesitas una cuenta. Entra con Google o regístrate gratis.</p>' +
    '<div class="column" style="width:100%;margin-top:16px">' +
    '<button type="button" class="btn-ghost panel-google" style="width:100%;justify-content:center">Continuar con Google</button>' +
    '<a href="registro.html" class="btn-cta" style="width:100%">Registrarme gratis</a>' +
    '<a href="login.html" class="btn-ghost" style="width:100%;justify-content:center">Ya tengo una cuenta</a>' +
    '</div></div>' +
    '<button type="button" class="close-btn" aria-label="Cerrar" onclick="window.closeAuth&&closeAuth()">' +
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>' +
    '</div>';
  guestModalEl.addEventListener('click', (e) => { if (e.target === guestModalEl) closeAuth(); });
  const gbtn = guestModalEl.querySelector('.panel-google');
  if (gbtn) gbtn.addEventListener('click', entrarConGoogle);
  document.body.appendChild(guestModalEl);
}

window.openAuth = function openAuth() {
  if (currentUser) { location.href = 'feed.html'; return; }
  crearPanelBienvenida();
  guestModalEl.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => guestModalEl.classList.add('open'), 10);
};

window.closeAuth = function closeAuth() {
  if (!guestModalEl || guestModalEl.hidden) return;
  guestModalEl.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { guestModalEl.hidden = true; }, 200);
};

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuth(); });

const REPARTOS = ['Centro', 'Atlántico', 'Caribe', 'José Martí', 'La Playa', 'Las Coloradas', 'Los Checos', 'Los Mangos', 'Miraflores', 'Rolo Monterrey', 'Otro municipio'];

const PALETA = [
  ['linear-gradient(135deg,#2A4A5E,#1A3040)'],
  ['linear-gradient(135deg,#3A2D1E,#241C12)'],
  ['linear-gradient(135deg,#1E2F3E,#111E28)'],
  ['linear-gradient(135deg,#4A3A1A,#2E2010)'],
  ['linear-gradient(135deg,#2E4A5A,#1C3040)'],
  ['linear-gradient(135deg,#3A2818,#221808)'],
];
const AVATAR_PALETA = [
  ['#2A4A5E', '#A8C4D8'],
  ['#3A2820', '#E8C9A0'],
  ['#2A2018', '#D4A054'],
  ['#1A2838', '#A8C4D8'],
  ['#243B2F', '#B7D6C3'],
  ['#402A3A', '#E3B8D0'],
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function gradiente(seed) { return PALETA[hashString(seed) % PALETA.length][0]; }
function avatarColor(seed) { return AVATAR_PALETA[hashString(seed) % AVATAR_PALETA.length]; }

function fmtPrecio(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function nombreCompleto(u) {
  if (!u) return '';
  const n = u.nombre || '';
  const a = u.apellidos || '';
  return `${n} ${a}`.trim();
}
function inicialesDe(u) {
  const partes = nombreCompleto(u).split(/\s+/).filter(Boolean);
  return ((partes[0] || '')[0] || '') + ((partes[1] || '')[0] || '');
}
function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dif = Date.now() - d.getTime();
  const min = Math.floor(dif / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return d.toLocaleDateString('es-CU');
}

const SVGS = {
  place: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  mini: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  heart: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M10 16.5C10 16.5 3 12.1 3 7.6a3.7 3.7 0 017-2.1 3.7 3.7 0 017 2.1c0 4.5-7 8.9-7 8.9Z"/></svg>',
  zone: '<svg width="8" height="8" viewBox="0 0 20 20" fill="none"><path d="M10 17C10 17 5 12.5 5 8.5a5 5 0 0110 0C15 12.5 10 17 10 17Z" stroke="currentColor" stroke-width="1.5"/></svg>',
  phone: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 012 4.18 2 2 0 014 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
  lock: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>',
  kebab: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>',
  eye: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 10S4 4 10 4s9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="10" cy="10" r="3"/></svg>',
  chat: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 5.5H17V13H8.5L5 16.5V13H3V5.5Z"/></svg>',
};

function avatarHtml(u, size) {
  const [bg, fg] = avatarColor(nombreCompleto(u));
  const cls = size ? `avatar ${size}` : 'avatar';
  return `<div class="${cls}" style="background:${bg};color:${fg}">${inicialesDe(u)}</div>`;
}

function chipEstadoProducto(estado) {
  if (estado === 'activo') return '<span class="status-chip available"><span class="dot-green"></span> Disponible</span>';
  if (estado === 'vendido') return '<span class="status-chip sold">Vendido</span>';
  return '<span class="status-chip paused">En pausa</span>';
}

const CLOUDINARY_CLOUD = 'xxz6yrvo';
function fotoUrl(f) {
  if (!f) return null;
  if (f.url) return f.url;
  if (f.cloudinaryPublicId) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto/${f.cloudinaryPublicId}`;
  }
  return null;
}

function fotoThumbHtml(prod) {
  const url = prod && prod.fotos && prod.fotos.length ? fotoUrl(prod.fotos[0]) : null;
  if (url) {
    return `<div class="thumb" style="background:#16202a"><img src="${url}" alt="${esc(prod.nombre)}" loading="lazy"></div>`;
  }
  return `<div class="thumb" style="background:${gradiente(prod ? prod.nombre : 'x')}"><div class="thumb-placeholder">${SVGS.place}<span>Sin foto aún</span></div></div>`;
}

function fotoMiniHtml(prod) {
  const url = prod && prod.fotos && prod.fotos.length ? fotoUrl(prod.fotos[0]) : null;
  if (url) {
    return `<div class="product-mini-image"><img src="${url}" alt="${esc(prod.nombre)}" loading="lazy"></div>`;
  }
  return `<div class="product-mini-image" style="background:${gradiente(prod ? prod.nombre : 'x')}"><div class="mini-placeholder">${SVGS.mini}</div></div>`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function secundariosHtml(pub) {
  const resto = (pub.productos || []).slice(1);
  if (resto.length === 0) return '';
  const items = resto.map((p) => `
    <div class="product-mini">
      ${fotoMiniHtml(p)}
      <div class="product-mini-info">
        <div class="product-mini-title">${esc(p.nombre)}</div>
        <div class="product-mini-price">${fmtPrecio(p.precio)} CUP</div>
        <div class="product-mini-status">${p.estado === 'activo' ? 'Disponible' : p.estado === 'vendido' ? 'Vendido' : 'En pausa'}</div>
      </div>
    </div>`).join('');
  return `<div class="secondary-wrap"><div class="secondary-lbl">También en esta publicación</div><div class="secondary-grid">${items}</div></div>`;
}

function heartHtml(session, productoId) {
  const cls = session ? 'heart-btn fav-btn' : 'heart-btn fav-btn guest-heart';
  return `<button class="${cls}" aria-label="Guardar" aria-pressed="false" data-id="${productoId}">${SVGS.heart}</button>`;
}

function kebabHtml(pub) {
  return `
    <button class="circle-btn kebab-btn" aria-label="Más opciones">${SVGS.kebab}</button>
    <div class="kebab-menu">
      <button data-act="compartir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Compartir</button>
      <hr>
      <button class="danger" data-act="reportar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Reportar publicación</button>
    </div>`;
}

// Tarjeta completa de publicación (feed)
function moaFeedCard(pub, session) {
  const prods = pub.productos || [];
  const principal = prods[0] || {};
  const vendedor = (pub.vendedor && pub.vendedor.user) || {};
  const mas = prods.length > 1 ? `+ ${prods.length - 1} producto${prods.length - 1 > 1 ? 's' : ''} más` : `${prods.length || 1} producto${prods.length === 1 ? '' : 's'}`;
  const telefono = pub.telefonoMovil || pub.telefonoFijo;
  const urlPub = `publicacion.html?id=${pub.id}`;
  const urlChat = `conversacion.html?user=${pub.vendedor ? pub.vendedor.userId : ''}`;
  const contacto = session
    ? `<a href="${urlChat}" class="action-btn primary">${SVGS.chat} Contactar</a>`
    : `<button class="action-btn primary contact-btn" onclick="openAuth();return false">${SVGS.chat} Contactar</button>`;

  return `
  <article class="card" data-id="${pub.id}">
    <div class="pub-head">
      ${avatarHtml(vendedor)}
      <div class="pub-meta">
        <span class="pub-name">${esc(nombreCompleto(vendedor))}</span>
        <div class="pub-sub">
          <span class="badge badge-zone">${SVGS.zone} ${esc(pub.reparto || '—')}</span>
          <span class="pub-time">${relTime(pub.creadoEn)}</span>
        </div>
      </div>
      ${session ? `<div class="head-actions">${heartHtml(true, principal.id)}${kebabHtml(pub)}</div>` : ''}
    </div>
    ${fotoThumbHtml(principal)}
    <div class="primary-prod">
      <div class="primary-prod-title">${esc(principal.nombre || pub.titulo)}</div>
      <div class="primary-prod-row">
        <div class="primary-prod-price">${fmtPrecio(principal.precio)} CUP</div>
        <span class="prod-count-lbl">${mas}</span>
      </div>
    </div>
    ${secundariosHtml(pub)}
    <div class="pub-footer">
      <div class="phone-chip">${SVGS.phone} ${session && telefono ? esc(telefono) : `<button type="button" class="phone-lock">${SVGS.lock} Ver teléfono</button>`}</div>
      <div class="pub-actions">
        <a href="${urlPub}" class="action-btn">${SVGS.eye} Ver</a>
        ${contacto}
      </div>
    </div>
  </article>`;
}

// Tarjeta compacta de publicación (vendedor / admin)
function moaCardMini(pub, session) {
  const prods = pub.productos || [];
  const principal = prods[0] || {};
  const mas = prods.length > 1 ? `+ ${prods.length - 1} más` : `${prods.length || 1} producto${prods.length === 1 ? '' : 's'}`;
  return `
  <article class="card" data-id="${pub.id}">
    ${session ? `<div class="head-actions" style="position:absolute;top:10px;right:10px">${heartHtml(true, principal.id)}</div>` : ''}
    ${fotoThumbHtml(principal)}
    <div class="primary-prod">
      <div class="primary-prod-title">${esc(principal.nombre || pub.titulo)}</div>
      <div class="primary-prod-row"><div class="primary-prod-price">${fmtPrecio(principal.precio)} CUP</div><span class="prod-count-lbl">${mas}</span></div>
    </div>
    <div class="pub-footer">
      <div class="pub-actions">
        <a href="publicacion.html?id=${pub.id}" class="action-btn">${SVGS.eye} Ver</a>
        <a href="conversacion.html?user=${pub.vendedor ? pub.vendedor.userId : ''}" class="action-btn primary">${SVGS.chat} Contactar</a>
      </div>
    </div>
  </article>`;
}

// Tarjeta a partir de un producto (favoritos / búsqueda)
function moaProdCard(prod, session, enFavoritos) {
  const pub = (prod.publicacion || {});
  const vendedor = (pub.vendedor && pub.vendedor.user) || {};
  const urlPub = `publicacion.html?id=${pub.id}`;
  const urlChat = `conversacion.html?user=${pub.vendedor ? pub.vendedor.userId : ''}`;
  const contacto = session
    ? `<a href="${urlChat}" class="action-btn primary">${SVGS.chat} Contactar</a>`
    : `<button class="action-btn primary contact-btn" onclick="openAuth();return false">${SVGS.chat} Contactar</button>`;
  return `
  <article class="card" data-id="${pub.id}">
    <div class="pub-head">
      ${avatarHtml(vendedor)}
      <div class="pub-meta">
        <span class="pub-name">${esc(nombreCompleto(vendedor))}</span>
        <div class="pub-sub">
          <span class="badge badge-zone">${SVGS.zone} ${esc(pub.reparto || '—')}</span>
        </div>
      </div>
    </div>
    ${enFavoritos && session ? `<div class="prod-fav-row">${heartHtml(session, prod.id)}</div>` : ''}
    ${fotoThumbHtml(prod)}
    <div class="primary-prod">
      <div class="primary-prod-title">${esc(prod.nombre)}</div>
      <div class="primary-prod-row"><div class="primary-prod-price">${fmtPrecio(prod.precio)} CUP</div><span class="prod-count-lbl">${esc(pub.titulo || '')}</span></div>
    </div>
    <div class="pub-footer">
      <div class="pub-actions">
        <a href="${urlPub}" class="action-btn">${SVGS.eye} Ver</a>
        ${contacto}
      </div>
    </div>
  </article>`;
}

// ---- encendido de interacciones ----

async function marcarFavoritos(grid) {
  if (!currentUser) return;
  try {
    const { ids } = await api.get('/favoritos/ids');
    const set = new Set(ids);
    (grid || document).querySelectorAll('.fav-btn[data-id]').forEach((btn) => {
      const on = set.has(btn.dataset.id);
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('active', on);
    });
  } catch (e) { /* sin sesión */ }
}

function bindKebab(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.kebab-btn');
    if (!btn) return;
    e.stopPropagation();
    const menu = btn.parentElement.querySelector('.kebab-menu');
    document.querySelectorAll('.kebab-menu.open').forEach((m) => { if (m !== menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
    return;
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.kebab-menu.open').forEach((m) => m.classList.remove('open'));
  });
}

function bindFav(root) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('.fav-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { if (window.openAuth) { openAuth(); } else { location.href = 'login.html'; } return; }
    const productoId = btn.dataset.id;
    const on = btn.getAttribute('aria-pressed') === 'true';
    try {
      if (on) { await api.del(`/favoritos/${productoId}`); }
      else { await api.post('/favoritos', { productoId }); }
      btn.setAttribute('aria-pressed', String(!on));
      btn.classList.toggle('active', !on);
      const ev = new CustomEvent('favorito-cambio', { detail: { productoId, on: !on } });
      window.dispatchEvent(ev);
    } catch (err) {
      alert(err.message || 'No se pudo guardar');
    }
  });
}

function bindGrid(root) {
  bindKebab(root);
  bindFav(root);
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.phone-lock');
    if (chip && !currentUser) { e.preventDefault(); openAuth(); }
  });
}