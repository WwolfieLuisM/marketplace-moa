const GOOGLE_CLIENT_ID = '687233405771-a2k8kvlp3nb0ufme42dqjpduiicmokbq.apps.googleusercontent.com';
const idiomaNavegador = (navigator.language || 'es').slice(0, 2);

let googleHandler = null;
let googleInstalado = false;

function esperarGoogle(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const check = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        resolve(true);
        return;
      }
      if (Date.now() - inicio >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 250);
    };
    check();
  });
}

async function inicializarGoogle() {
  const listo = await esperarGoogle();
  const g = window.google && window.google.accounts && window.google.accounts.id;
  if (!listo || !g) return false;
  if (!googleInstalado) {
    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        if (resp && resp.credential && googleHandler) {
          googleHandler(resp.credential);
        }
      },
    });
    googleInstalado = true;
  }
  return true;
}

async function renderBotonGoogle(containerId, onCredential) {
  googleHandler = onCredential;
  const listo = await inicializarGoogle();
  const g = window.google && window.google.accounts && window.google.accounts.id;
  if (!listo || !g) return false;
  const el = document.getElementById(containerId);
  if (!el) return false;
  const width = Math.max(el.parentElement ? el.parentElement.clientWidth : 0, 200);
  try {
    g.renderButton(el, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: width,
      locale: idiomaNavegador,
      text: 'continue_with',
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function promptGoogle(onCredential) {
  googleHandler = onCredential;
  const listo = await inicializarGoogle();
  const g = window.google && window.google.accounts && window.google.accounts.id;
  if (!listo || !g) return false;
  try {
    g.prompt(() => {});
    return true;
  } catch (e) {
    return false;
  }
}