const API_URL = 'https://moa-api-8y3i.onrender.com';

let accessToken = null;
let currentUser = null;

async function refrescarSesion() {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      accessToken = null;
      currentUser = null;
      return null;
    }
    const data = await res.json();
    accessToken = data.accessToken;
    currentUser = data.user;
    return currentUser;
  } catch (e) {
    accessToken = null;
    currentUser = null;
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && accessToken) {
    await refrescarSesion();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Error de red');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
};

// --- Sesión compartida ---
let sesionPromise = null;
async function esperarSesion() {
  if (!sesionPromise) sesionPromise = refrescarSesion();
  return sesionPromise;
}

// Pide sesión y muestra el panel de bienvenida si no hay (devuelve el usuario o null)
async function pedirLogin() {
  await esperarSesion();
  if (!currentUser) {
    if (typeof window.openAuth === 'function') { openAuth(); } else { location.href = 'login.html'; }
    return null;
  }
  return currentUser;
}

async function cerrarSesion() {
  try {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) { /* sin red */ }
  accessToken = null;
  currentUser = null;
  location.href = 'feed-guest.html';
}