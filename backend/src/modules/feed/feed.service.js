import prisma from "../../lib/prisma.js";

const PAGE_SIZE = 20;

// ranking del feed (spec):
// score = 0.5 * factor_suscripcion + 0.35 * factor_recencia + 0.15 * factor_reparto
// factor_suscripcion: activo/exento=1.0, demo=0.6, vencido(en gracia)=0.2
// factor_recencia: 1 / (1 + horas_desde_publicado/24)
// factor_reparto: mismo reparto del usuario=1.0, mismo municipio=0.6, otro=0.3
const ORDER_SQL = {
  relevancia: "score DESC, p.creado_en DESC",
  recientes: "p.creado_en DESC",
  menor_precio: `(SELECT MIN(pr.precio) FROM productos pr WHERE pr.publicacion_id = p.id AND pr.estado = 'activo') ASC NULLS LAST`,
  mayor_precio: `(SELECT MAX(pr.precio) FROM productos pr WHERE pr.publicacion_id = p.id AND pr.estado = 'activo') DESC NULLS LAST`,
};

async function feed({ repartoUsuario, repartoFiltro, categoriaId, orden, page = 1 }) {
  const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;
  const repartoSeleccionado = repartoFiltro?.trim() ? repartoFiltro.trim() : null;
  const repartoRef = repartoFiltro?.trim() ? repartoFiltro.trim() : repartoUsuario || null;
  const ordenKey = ORDER_SQL[orden] ? orden : "relevancia";

  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT p.id, p.titulo, p.reparto, p.creado_en, vp.estado_suscripcion,
           p.con_domicilio,
           0.5 * (CASE
             WHEN vp.estado_suscripcion IN ('activo', 'exento') THEN 1.0
             WHEN vp.estado_suscripcion = 'demo' THEN 0.6
             WHEN vp.estado_suscripcion = 'vencido' THEN 0.2
             ELSE 0.0 END)
         + 0.35 * (1 / (1 + (EXTRACT(EPOCH FROM (now() - p.creado_en)) / 3600) / 24))
         + 0.15 * (CASE
             WHEN $2::text IS NULL THEN 0.6
             WHEN p.reparto = $2::text THEN 1.0
             ELSE 0.3 END)
           AS score
    FROM publicaciones p
    JOIN vendedor_perfil vp ON vp.id = p.vendedor_id
    WHERE p.estado = 'activo'
      AND vp.estado_suscripcion IN ('demo', 'activo', 'exento')
      AND ($1::text IS NULL OR p.reparto = $1::text)
      AND ($3::int IS NULL OR EXISTS (
        SELECT 1 FROM productos pr WHERE pr.publicacion_id = p.id
          AND pr.estado = 'activo' AND pr.categoria_id = $3::int
      ))
    ORDER BY ${ORDER_SQL[ordenKey]}
    LIMIT $4 OFFSET $5
    `,
    repartoSeleccionado,
    repartoRef,
    categoriaId ? Number(categoriaId) : null,
    PAGE_SIZE,
    offset
  );

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return [];
  }

  const publicaciones = await prisma.publicacion.findMany({
    where: { id: { in: ids } },
    include: {
      vendedor: { include: { user: { select: { nombre: true, apellidos: true } } } },
      productos: {
        where: { estado: "activo" },
        orderBy: { orden: "asc" },
        include: {
          categoria: { select: { id: true, nombre: true } },
          fotos: { orderBy: { orden: "asc" } },
        },
      },
    },
  });

  if (ordenKey === "relevancia") {
    const scorePorId = Object.fromEntries(rows.map((r) => [r.id, Number(r.score)]));
    return publicaciones
      .map((pub) => ({ ...pub, score: scorePorId[pub.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }

  // Para orden fijo (precio/recientes) respetamos el orden devuelto por la query raw.
  const indice = Object.fromEntries(rows.map((r, i) => [r.id, i]));
  return publicaciones
    .map((pub) => ({ ...pub, score: 0 }))
    .sort((a, b) => indice[a.id] - indice[b.id]);
}

// Búsqueda por trigramas con el índice GIN (pg_trgm).
async function buscar({ q, page = 1 }) {
  if (!q?.trim()) {
    throw Object.assign(new Error("Falta el término de búsqueda"), { status: 400 });
  }
  const termino = q.trim();
  const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;

  const rows = await prisma.$queryRaw`
    SELECT pr.id, pr.publicacion_id, pr.nombre, pr.descripcion, pr.precio, pr.cantidad,
           pr.categoria_id, similarity(pr.nombre, ${termino}::text) AS sim
    FROM productos pr
    JOIN publicaciones p ON p.id = pr.publicacion_id
    JOIN vendedor_perfil vp ON vp.id = p.vendedor_id
    WHERE pr.estado = 'activo'
      AND p.estado = 'activo'
      AND vp.estado_suscripcion IN ('demo', 'activo', 'exento')
      AND (pr.nombre ILIKE '%' || ${termino}::text || '%'
        OR pr.descripcion ILIKE '%' || ${termino}::text || '%')
    ORDER BY sim DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return [];
  }

  const productos = await prisma.producto.findMany({
    where: { id: { in: ids } },
    include: {
      publicacion: { include: { vendedor: { include: { user: { select: { nombre: true, apellidos: true } } } } } },
      categoria: { select: { id: true, nombre: true } },
      fotos: { orderBy: { orden: "asc" } },
    },
  });

  const simPorId = Object.fromEntries(rows.map((r) => [r.id, Number(r.sim)]));
  return productos
    .map((prod) => ({ ...prod, score: simPorId[prod.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export default { feed, buscar };