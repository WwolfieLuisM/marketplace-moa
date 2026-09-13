import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let app = null;
let messaging = null;
let habilitado = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

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