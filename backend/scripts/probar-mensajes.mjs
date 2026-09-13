import "dotenv/config";

const BASE = "http://localhost:3001";

let vendedorToken, vendedorId, compradorToken, compradorId, adminToken, publicacionId, productoId;

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
const suffix = String(uniq).slice(-6);
const emailV = `mensajero.${uniq}@test.com`;
const emailC = `comprador.${uniq}@test.com`;

// 1. Registrar vendedor y comprador
const regV = await api("POST", "/auth/register", {
  body: { nombre: "Mensajero", apellidos: "Vendedor Test", email: emailV, telefono: `+535557${suffix}`, password: "demo1234", reparto: "Centro" },
});
vendedorToken = regV.accessToken;
vendedorId = regV.user.id;
console.log("1. Vendedor registrado:", emailV);

const regC = await api("POST", "/auth/register", {
  body: { nombre: "Comprador", apellidos: "Test", email: emailC, telefono: `+535558${suffix}`, password: "demo1234", reparto: "Riazul" },
});
compradorToken = regC.accessToken;
compradorId = regC.user.id;
console.log("2. Comprador registrado:", emailC);

// 3. Vendedor solicita y admin aprueba (demo) para poder publicar
const solicitud = await api("POST", "/vendedores/solicitud", {
  token: vendedorToken,
  body: { tipo: "individual", nombre: "Mensajero", apellidos: "Vendedor Test", numeroCi: "91091234568", reparto: "Centro" },
});
adminToken = (await api("POST", "/auth/login", {
  body: { cuenta: "prueba.exitosa@test.com", password: "secreto123" },
})).accessToken;
const aprobado = await api("POST", `/vendedores/${solicitud.perfil.id}/aprobar`, { token: adminToken, body: { moda: "demo" } });
console.log("3. Vendedor aprobado:", aprobado.perfil.estadoSuscripcion);

const publicacion = await api("POST", "/publicaciones", {
  token: vendedorToken,
  body: {
    titulo: "Producto de prueba mensajería",
    reparto: "Centro",
    productos: [{ nombre: "Pan de prueba", descripcion: "Producto para probar chat", precio: 30, cantidad: 5, categoriaId: 2 }],
  },
});
publicacionId = publicacion.publicacion.id;
const detalle = await api("GET", `/publicaciones/${publicacionId}`);
productoId = detalle.publicacion.productos[0].id;
console.log("4. Publicación:", publicacionId, "| producto:", productoId);

// 5. CASO 1: mensaje con producto_id presente (comprador -> vendedor)
const m1 = await api("POST", "/mensajes", {
  token: compradorToken,
  body: { destinatarioId: vendedorId, productoId, contenido: "Hola, ¿tienes este pan disponible hoy?" },
});
console.log("5. Mensaje con producto:", m1.mensaje.productoId === productoId ? "OK producto asociado" : "MAL sin producto", "| leido:", m1.mensaje.leido);

// 6. CASO 2: mensaje sin producto_id (general al vendedor)
const m2 = await api("POST", "/mensajes", {
  token: compradorToken,
  body: { destinatarioId: vendedorId, contenido: "Hola, ¿haces pedidos para el fin de semana?" },
});
console.log("6. Mensaje general:", m2.mensaje.productoId === null ? "OK productoId null" : `MAL productoId=${m2.mensaje.productoId}`);

// 7. Vendedor responde (también puede referenciar su producto)
const m3 = await api("POST", "/mensajes", {
  token: vendedorToken,
  body: { destinatarioId: compradorId, productoId, contenido: "Sí, el pan está disponible. ¿Cuánto quisieras?" },
});
console.log("7. Respuesta vendedor (con producto):", m3.mensaje.contenido);

// 8. No leídos y conversaciones del vendedor
const nl = await api("GET", "/mensajes/no-leidos", { token: vendedorToken });
console.log("8. no-leidos vendedor:", nl.noLeidos, "(esperado 2)");
const conv = await api("GET", "/mensajes/conversaciones", { token: vendedorToken });
console.log("   Conversaciones:", conv.conversaciones.length, "| noLeidos en conversación:", conv.conversaciones[0]?.noLeidos);

// 9. Hilo: comprador abre conversación -> marca como leído, orden asc
const hilo = await api("GET", `/mensajes/conversaciones/${vendedorId}`, { token: compradorToken });
console.log("9. Hilo comprador:", hilo.conversacion.mensajes.length, "mensajes (esperado 3) | orden:", hilo.conversacion.mensajes.map((m) => m.remitenteId).join("->"));
const nlV2 = await api("GET", "/mensajes/no-leidos", { token: vendedorToken });
console.log("   no-leidos vendedor tras leer el comprador:", nlV2.noLeidos, "(sigue 2, él no ha leído)");

// 10. Vendedor abre hilo -> marca como leído
await api("GET", `/mensajes/conversaciones/${compradorId}`, { token: vendedorToken });
const nlV3 = await api("GET", "/mensajes/no-leidos", { token: vendedorToken });
console.log("10. no-leidos vendedor tras leer:", nlV3.noLeidos, "(esperado 0)");

// 11. Negativos
try {
  await api("POST", "/mensajes", { token: compradorToken, body: { destinatarioId: compradorId, contenido: "auto" } });
  console.log("11a. AUTO-MENSAJE: NO ARROJÓ (mal)");
} catch (e) {
  console.log("11a. Auto-mensaje rechazado:", e.message.split("-> ")[1]);
}
try {
  await api("POST", "/mensajes", { token: compradorToken, body: { destinatarioId: vendedorId, productoId: "00000000-0000-0000-0000-000000000000", contenido: "¿existe?" } });
  console.log("11b. PRODUCTO INEXISTENTE: NO ARROJÓ (mal)");
} catch (e) {
  console.log("11b. Producto inexistente rechazado:", e.message.split("-> ")[1]);
}
try {
  await api("POST", "/mensajes", { token: compradorToken, body: { destinatarioId: vendedorId, contenido: "   " } });
  console.log("11c. VACÍO: NO ARROJÓ (mal)");
} catch (e) {
  console.log("11c. Mensaje vacío rechazado:", e.message.split("-> ")[1]);
}
try {
  await api("POST", "/mensajes", { token: compradorToken, body: { destinatarioId: "00000000-0000-0000-0000-000000000000", contenido: "hola?" } });
  console.log("11d. DESTINATARIO INEXISTENTE: NO ARROJÓ (mal)");
} catch (e) {
  console.log("11d. Destinatario inexistente rechazado:", e.message.split("-> ")[1]);
}

// 12. Sin auth
try {
  await api("GET", "/mensajes/conversaciones", {});
  console.log("12. SIN-AUTH: NO ARROJÓ (mal)");
} catch (e) {
  console.log("12. Sin auth rechazado:", e.message.split("-> ")[1]);
}

console.log("\n=== FIN: vendedor:", emailV, "| comprador:", emailC, "| producto:", productoId, "===");