import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let app = null;
let messaging = null;
let habilitado = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

function cleanPem(raw) {
  if (!raw) return raw;
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  const marker = "-----END PRIVATE KEY-----";
  const end = v.indexOf(marker);
  if (end !== -1) v = v.substring(0, end + marker.length);
  return v;
}

const privateKey = cleanPem(privateKeyRaw);

if (projectId && clientEmail && privateKey) {
  try {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    messaging = getMessaging(app);
    habilitado = true;
  } catch (e) {
    console.error("Firebase Admin no inicializado:", e.message);
  }
} else {
  console.warn("Firebase Admin deshabilitado: faltan FIREBASE_* en el entorno");
}

export { app, messaging, habilitado };