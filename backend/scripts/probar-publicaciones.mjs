import "dotenv/config";

const BASE = "http://localhost:3001";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let adminToken, vendedorId, publicacionId;

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
const email = `panadero.${uniq}@test.com`;
const telefono = `+535558${String(uniq).slice(-4)}`;

// 1. Registrar usuario
const reg = await api("POST", "/auth/register", {
  body: { nombre: "Panadero", apellidos: "Prueba Demo", email, telefono, password: "demo1234", reparto: "Centro" },
});
console.log("1. Registro:", reg.user.email);

// 2. Solicitar vendedor (individual)
const solicitud = await api("POST", "/vendedores/solicitud", {
  token: reg.accessToken,
  body: { tipo: "individual", nombre: "Panadero", apellidos: "Prueba Demo", numeroCi: "91091234567", reparto: "Centro" },
});
console.log("2. Solicitud vendedor:", solicitud.perfil.estadoLicencia);

// 3. Aprobar como demo (admin)
adminToken = (await api("POST", "/auth/login", {
  body: { cuenta: "prueba.exitosa@test.com", password: "secreto123" },
})).accessToken;
const aprobado = await api("POST", `/vendedores/${solicitud.perfil.id}/aprobar`, {
  token: adminToken,
  body: { moda: "demo" },
});
console.log("3. Aprobado demo:", aprobado.perfil.estadoSuscripcion);
vendedorId = solicitud.perfil.id;

// 4. Crear publicación con 2 productos, uno con foto
const creada = await api("POST", "/publicaciones", {
  token: reg.accessToken,
  body: {
    titulo: "Pan artesanal del día",
    reparto: "Centro",
    conDomicilio: true,
    telefonoFijo: "24555555",
    telefonoMovil: "+5355569999",
    productos: [
      { nombre: "Pan de flauta", descripcion: "Pan francés recién horneado", precio: 50, cantidad: 20, categoriaId: 2, fotos: [PNG] },
      { nombre: "Pan de huevo", descripcion: "Pan dulce clásico", precio: 40, cantidad: 15, categoriaId: 2, fotos: [] },
    ],
  },
});
publicacionId = creada.publicacion.id;
const detalle = await api("GET", `/publicaciones/${publicacionId}`);
console.log("4. Publicación creada:", publicacionId, "| productos:", detalle.publicacion.productos.length);
console.log("   Foto url:", detalle.publicacion.productos[0].fotos[0]?.url);

const me1 = await api("GET", "/vendedores/me", { token: reg.accessToken });
console.log("   Contadores demo: hoy=", me1.perfil.productosHoy, "total=", me1.perfil.productosTotalDemo);

// 5. Límite de 3 productos por publicación
try {
  await api("POST", "/publicaciones", {
    token: reg.accessToken,
    body: { titulo: "Demo límite", reparto: "Centro", productos: [
      { nombre: "P1", descripcion: "x", precio: 1, cantidad: 1, categoriaId: 2 },
      { nombre: "P2", descripcion: "x", precio: 1, cantidad: 1, categoriaId: 2 },
      { nombre: "P3", descripcion: "x", precio: 1, cantidad: 1, categoriaId: 2 },
      { nombre: "P4", descripcion: "x", precio: 1, cantidad: 1, categoriaId: 2 },
    ] },
  });
  console.log("5. LIMITE-3: NO ARROJÓ ERROR (mal)");
} catch (e) {
  console.log("5. Límite 3 productos: OK ->", e.message.split("-> ")[1]);
}

// 6. Límite 5/día: ya se crearon 2 hoy; crear 3 más = 5 (ok), luego 1 = 6 (debe fallar)
for (let i = 0; i < 3; i++) {
  await api("POST", "/publicaciones", {
    token: reg.accessToken,
    body: { titulo: `Pan diario ${i}`, reparto: "Centro", productos: [
      { nombre: `Producto ${i}`, descripcion: "Prueba límite diario", precio: 10, cantidad: 1, categoriaId: 2 },
    ] },
  });
}
const me2 = await api("GET", "/vendedores/me", { token: reg.accessToken });
console.log("6. Tras 3 más: hoy=", me2.perfil.productosHoy, "(esperado 5)");
try {
  await api("POST", "/publicaciones", {
    token: reg.accessToken,
    body: { titulo: "Pan extra", reparto: "Centro", productos: [
      { nombre: "Extra", descripcion: "Rebasa el límite diario", precio: 10, cantidad: 1, categoriaId: 2 },
    ] },
  });
  console.log("6. LÍMITE-DÍA: NO ARROJÓ ERROR (mal)");
} catch (e) {
  console.log("6. Límite 5/día: OK ->", e.message.split("-> ")[1]);
}

// 7. Límite total 10 (aislado del diario): forzamos total=8, hoy=0 y contador viejo,
//    luego un lote de 3 -> total 11 (debe fallar por el total, no por el día)
const prisma = (await import("../src/lib/prisma.js")).default;
await prisma.vendedorPerfil.update({
  where: { id: vendedorId },
  data: { productosHoy: 0, productosTotalDemo: 8, ultimoResetContador: new Date(Date.now() - 2 * 864e5) },
});
try {
  await api("POST", "/publicaciones", {
    token: reg.accessToken,
    body: { titulo: "Lote límite total", reparto: "Centro", productos: ["T1", "T2", "T3"].map((n, i) => ({
      nombre: n, descripcion: "Lote límite total", precio: 1, cantidad: 1, categoriaId: 2,
    })) },
  });
  console.log("7. LÍMITE-TOTAL: NO ARROJÓ ERROR (mal)");
} catch (e) {
  console.log("7. Límite 10 total: OK ->", e.message.split("-> ")[1]);
}
const me3 = await api("GET", "/vendedores/me", { token: reg.accessToken });
console.log("   Final: hoy=", me3.perfil.productosHoy, "total=", me3.perfil.productosTotalDemo);
await prisma.$disconnect();

// 8. Feed ranking (invitado) y por categoría
const feed = await api("GET", "/feed");
console.log("8. Feed:", feed.feed.length, "| top:", feed.feed[0]?.titulo, "| score:", feed.feed[0]?.score?.toFixed?.(3));

// 9. Búsqueda GIN (trigramas)
const busqueda = await api("GET", "/feed/productos?q=flauta");
console.log("9. Búsqueda 'flauta':", busqueda.productos.length, "|", busqueda.productos[0]?.nombre);

// 10. Marcar producto vendido
const prods = detalle.publicacion.productos;
await api("PATCH", `/publicaciones/${publicacionId}/productos/${prods[0].id}`, {
  token: reg.accessToken,
  body: { estado: "vendido" },
});
console.log("10. Producto vendido: OK");

// 11. Soft delete publicación y verificar que desaparece del feed
await api("DELETE", `/publicaciones/${publicacionId}`, { token: reg.accessToken });
const feed2 = await api("GET", "/feed");
console.log("11. Soft delete:", feed2.feed.some((p) => p.id === publicacionId) ? "SÍ aparece (mal)" : "ya no aparece (ok)");

console.log("\n=== FIN: id publicación:", publicacionId, "| email:", email, "===");
