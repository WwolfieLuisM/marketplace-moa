import prisma from "../../lib/prisma.js";

const PAGE_SIZE = 20;

// ranking del feed (spec):
// score = 0.5 * factor_suscripcion + 0.35 * factor_recencia + 0.15 * factor_reparto
// factor_suscripcion: activo/exento=1.0, demo=0.6, vencido(en gracia)=0.2
// factor_recencia: 1 / (1 + horas_desde_publicado/24)
// factor_reparto: mismo reparto del usuario=1.0, mismo municipio=0.6, otro=0.3
async function feed({ repartoUsuario, repartoFiltro, categoriaId, page = 1 }) {
  const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;
  const repartoRef = repartoFiltro || repartoUsuario;

  const rows = await prisma.$queryRaw`
    SELECT p.id, p.titulo, p.reparto, p.creado_en, vp.estado_suscripcion,
           p.con_domicilio,
           0.5 * (CASE
             WHEN vp.estado_suscripcion IN ('activo', 'exento') THEN 1.0
             WHEN vp.estado_suscripcion = 'demo' THEN 0.6
             WHEN vp.estado_suscripcion = 'vencido' THEN 0.2
             ELSE 0.0 END)
         + 0.35 * (1 / (1 + (EXTRACT(EPOCH FROM (now() - p.creado_en)) / 3600) / 24))
         + 0.15 * (CASE
             WHEN ${repartoRef ?? null}::text IS NULL THEN 0.6
             WHEN p.reparto = ${repartoRef ?? null}::text THEN 1.0
             ELSE 0.3 END)
           AS score
    FROM publicaciones p
    JOIN vendedor_perfil vp ON vp.id = p.vendedor_id
    WHERE p.estado = 'activo'
      AND vp.estado_suscripcion IN ('demo', 'activo', 'exento')
      AND (${repartoFiltro ?? null}::text IS NULL OR p.reparto = ${repartoFiltro ?? null}::text)
      AND (${categoriaId ? Number(categoriaId) : null}::int IS NULL OR EXISTS (
        SELECT 1 FROM productos pr WHERE pr.publicacion_id = p.id
          AND pr.estado = 'activo' AND pr.categoria_id = ${categoriaId ? Number(categoriaId) : null}::int
      ))
    ORDER BY score DESC, p.creado_en DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

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

  const scorePorId = Object.fromEntries(rows.map((r) => [r.id, Number(r.score)]));
  return publicaciones
    .map((pub) => ({ ...pub, score: scorePorId[pub.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
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