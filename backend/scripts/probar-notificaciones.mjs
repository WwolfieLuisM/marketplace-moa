import "dotenv/config";

const BASE = "http://localhost:3001";

let adminToken, usuToken, userId;

async function api(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const uniq = Date.now();
const email = `notif.${uniq}@test.com`;

// 1. Registrar usuario receptor
const reg = await api("POST", "/auth/register", {
  body: { nombre: "Notifi", apellidos: "Test", email, telefono: `+535559${String(uniq).slice(-4)}`, password: "demo1234", reparto: "Centro" },
});
usuToken = reg.accessToken;
userId = reg.user.id;
console.log("1. Usuario registrado:", email, "|", userId);

// 2. Registrar dispositivo FCM (token de prueba dummy, no golpeará la red real)
const disp = await api("POST", "/notificaciones/device-tokens", {
  token: usuToken,
  body: { fcmToken: "dummy-token-notif-test-123", plataforma: "web" },
});
console.log("2. Device token registrado:", disp.dispositivo.fcmToken);

// 3. Duplicado no se repite
const disp2 = await api("POST", "/notificaciones/device-tokens", {
  token: usuToken,
  body: { fcmToken: "dummy-token-notif-test-123", plataforma: "web" },
});
console.log("3. Duplicado idempotente:", disp2.dispositivo.id === disp.dispositivo.id ? "OK mismo registro" : "MAL creó otro");

// 4. Enviar notificación vía servicio (simula push de sistema)
const prisma = (await import("../src/lib/prisma.js")).default;
const notif = await prisma.notificacion.create({
  data: { userId, tipo: "test", titulo: "Hola de prueba", cuerpo: "Mensaje de prueba" },
});
console.log("4. Notificación creada en BD:", notif.id);

// 5. Listar notificaciones propias
const listado = await api("GET", "/notificaciones", { token: usuToken });
console.log("5. Listado:", listado.notificaciones.length, "| total:", listado.total, "| noLeidas:", listado.noLeidas);

// 6. Contador no-leidas
const nl = await api("GET", "/notificaciones/no-leidas", { token: usuToken });
console.log("6. /no-leidas:", nl.noLeidas, "(esperado 1)");

// 7. Marcar leída
const marcada = await api("PATCH", `/notificaciones/${notif.id}/leida`, { token: usuToken });
console.log("7. Marcar leída:", marcada.notificacion.leido === true ? "OK" : "MAL");

// 8. Marcar todas leídas
const todas = await api("PATCH", "/notificaciones/marcar-todas-leidas", { token: usuToken });
console.log("8. Marcar todas:", todas.actualizadas);

// 9. Negativos
try {
  await api("GET", "/notificaciones", {});
  console.log("9a. SIN-AUTH: NO ARROJÓ (mal)");
} catch (e) {
  console.log("9a. Sin auth rechazado:", e.message.split("-> ")[1]);
}
try {
  await api("PATCH", `/notificaciones/${notif.id}/leida`, { token: adminToken || "" });
  console.log("9b. AJENO: NO ARROJÓ (mal)");
} catch (e) {
  console.log("9b. Marcar notificación de otro (sin login):", e.message.split("-> ")[1]);
}
try {
  await api("POST", "/notificaciones/device-tokens", { token: usuToken, body: { fcmToken: "" } });
  console.log("9c. TOKEN VACÍO: NO ARROJÓ (mal)");
} catch (e) {
  console.log("9c. Token vacío rechazado:", e.message.split("-> ")[1]);
}

// 10. Marcar leída de notificación inexistente
try {
  await api("PATCH", "/notificaciones/00000000-0000-0000-0000-000000000000/leida", { token: usuToken });
  console.log("10. INEXISTENTE: NO ARROJÓ (mal)");
} catch (e) {
  console.log("10. Notificación inexistente:", e.message.split("-> ")[1]);
}

// 11. Eliminar device token registrado (antes de que la integración lo autolimpie)
const del = await api("DELETE", "/notificaciones/device-tokens", {
  token: usuToken,
  body: { fcmToken: "dummy-token-notif-test-123" },
});
console.log("11. Token eliminado:", del.eliminados === 1 ? "OK" : `MAL ${del.eliminados}`);

// 12. Verificar que mensaje nuevo genera notificación (integración con mensajería)
const email2 = `notif.b${uniq}@test.com`;
const reg2 = await api("POST", "/auth/register", {
  body: { nombre: "Emisor", apellidos: "Test", email: email2, telefono: `+535551${String(uniq).slice(-4)}`, password: "demo1234", reparto: "Centro" },
});
await api("POST", "/mensajes", {
  token: reg2.accessToken,
  body: { destinatarioId: userId, contenido: "Mensaje que debe generar notificación" },
});
const despues = await api("GET", "/notificaciones/no-leidas", { token: usuToken });
console.log("12. Tras mensaje nuevo, no-leidas =", despues.noLeidas, "(esperado 1: la del mensaje)", despues.noLeidas === 1 ? "OK" : "MAL");
const lista2 = await api("GET", "/notificaciones", { token: usuToken });
console.log("    Última notificación:", lista2.notificaciones[0]?.tipo, "|", lista2.notificaciones[0]?.titulo);

console.log("\n=== FIN: usuario:", email, "| notificacion:", notif.id, "===");
await prisma.$disconnect();