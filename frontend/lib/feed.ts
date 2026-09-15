"use client";

// Convierte un producto de búsqueda/favoritos en una publicación de feed de un
// solo producto, para reutilizar ProductCard en /feed, /favoritos y buscador.
import type { FeedPublicacion, ProductoResultado } from "./types";

export function sintetizarPublicacion(r: ProductoResultado): FeedPublicacion {
  const pub = r.publicacion;
  return {
    id: pub.id,
    titulo: pub.titulo,
    reparto: pub.reparto ?? null,
    conDomicilio: pub.conDomicilio,
    telefonoFijo: pub.telefonoFijo ?? null,
    telefonoMovil: pub.telefonoMovil ?? null,
    estado: pub.estado,
    creadoEn: pub.creadoEn,
    score: r.score,
    vendedor: pub.vendedor ?? null,
    productos: [
      {
        id: r.id,
        publicacionId: r.publicacionId,
        nombre: r.nombre,
        descripcion: r.descripcion,
        precio: r.precio,
        cantidad: r.cantidad,
        categoria: r.categoria ?? null,
        orden: r.orden,
        estado: r.estado,
        fotos: r.fotos ?? [],
      },
    ],
  };
}