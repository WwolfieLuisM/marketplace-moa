import prisma from "../../lib/prisma.js";
import { subirFoto } from "../../lib/cloudinary.js";

const MAX_PRODUCTOS_POR_PUBLICACION = 3;
const MAX_FOTOS_POR_PRODUCTO = 3;
const LIMITE_PRODUCTOS_POR_DIA_DEMO = 5;
const LIMITE_PRODUCTOS_TOTAL_DEMO = 10;
const SUSCRIPCIONES_QUE_PUEDEN_PUBLICAR = ["demo", "activo", "exento"];

// El "día" del contador de demo es el día de Cuba (America/Havana), no el de
// la zona horaria del servidor (Render corre en UTC). Así los 5 productos/día
// se reinician a medianoche cubana aunque el proceso viva en otro huso.
function claveDiaCuba(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha); // YYYY-MM-DD
}

async function obtenerContadorDia(perfil) {
  const claveHoy = claveDiaCuba();
  const claveGuardada = perfil.ultimoResetContador
    ? claveDiaCuba(new Date(perfil.ultimoResetContador))
    : null;

  if (claveGuardada !== claveHoy) {
    await prisma.vendedorPerfil.update({
      where: { id: perfil.id },
      data: { productosHoy: 0, ultimoResetContador: new Date() },
    });
    return 0;
  }
  return perfil.productosHoy;
}

async function getVendedorPublicador(userId) {
  const perfil = await prisma.vendedorPerfil.findUnique({ where: { userId } });
  if (
    !perfil ||
    perfil.estadoLicencia !== "aprobado" ||
    !SUSCRIPCIONES_QUE_PUEDEN_PUBLICAR.includes(perfil.estadoSuscripcion)
  ) {
    throw Object.assign(new Error("Tu licencia de vendedor no está aprobada o la suscripción no está vigente"), {
      status: 403,
    });
  }
  return perfil;
}

async function validarFoto(foto) {
  if (typeof foto !== "string") {
    throw Object.assign(new Error("Cada foto debe ser una cadena"), { status: 400 });
  }
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(foto)) {
    throw Object.assign(new Error("Solo se aceptan imágenes PNG, JPG o WebP en base64"), { status: 400 });
  }
}

async function validarContadoresDemo(perfil, cantidadNueva) {
  if (perfil.estadoSuscripcion !== "demo") {
    return;
  }

  const productosHoy = await obtenerContadorDia(perfil);

  if (productosHoy + cantidadNueva > LIMITE_PRODUCTOS_POR_DIA_DEMO) {
    throw Object.assign(new Error(`En el plan demo puedes publicar máx ${LIMITE_PRODUCTOS_POR_DIA_DEMO} productos al día`), {
      status: 400,
    });
  }

  const nuevosTotal = perfil.productosTotalDemo + cantidadNueva;
  if (nuevosTotal > LIMITE_PRODUCTOS_TOTAL_DEMO) {
    throw Object.assign(
      new Error(`En el plan demo puedes publicar máx ${LIMITE_PRODUCTOS_TOTAL_DEMO} productos en total`),
      { status: 400 }
    );
  }
}

async function crear({ userId, datos }) {
  const { titulo, reparto, conDomicilio, telefonoFijo, telefonoMovil, productos } = datos || {};

  if (!titulo?.trim() || !reparto?.trim()) {
    throw Object.assign(new Error("Faltan título o reparto"), { status: 400 });
  }
  if (!Array.isArray(productos) || productos.length < 1 || productos.length > MAX_PRODUCTOS_POR_PUBLICACION) {
    throw Object.assign(new Error(`Una publicación necesita entre 1 y ${MAX_PRODUCTOS_POR_PUBLICACION} productos`), {
      status: 400,
    });
  }

  const perfil = await getVendedorPublicador(userId);
  await validarContadoresDemo(perfil, productos.length);

  const idsCategorias = await prisma.categoria.findMany({
    where: { id: { in: productos.map((p) => p.categoriaId) } },
    select: { id: true },
  });
  const setCategorias = new Set(idsCategorias.map((c) => c.id));

  const datosProductos = [];
  for (const [idx, producto] of productos.entries()) {
    if (!producto.nombre?.trim() || !producto.descripcion?.trim()) {
      throw Object.assign(new Error(`El producto ${idx + 1} necesita nombre y descripción`), { status: 400 });
    }
    const precio = Number(producto.precio);
    if (!Number.isFinite(precio) || precio <= 0) {
      throw Object.assign(new Error(`El producto ${idx + 1} necesita un precio válido`), { status: 400 });
    }
    const cantidad = Number(producto.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw Object.assign(new Error(`El producto ${idx + 1} necesita una cantidad válida`), { status: 400 });
    }
    if (!setCategorias.has(producto.categoriaId)) {
      throw Object.assign(new Error(`Categoría inválida en el producto ${idx + 1}`), { status: 400 });
    }

    const fotos = Array.isArray(producto.fotos) ? producto.fotos.slice(0, MAX_FOTOS_POR_PRODUCTO) : [];
    for (const foto of fotos) {
      await validarFoto(foto);
    }

    datosProductos.push({
      nombre: producto.nombre.trim(),
      descripcion: producto.descripcion.trim(),
      precio,
      cantidad,
      categoriaId: producto.categoriaId,
      orden: idx,
      fotos,
    });
  }

  const publicacion = await prisma.$transaction(async (tx) => {
    const creada = await tx.publicacion.create({
      data: {
        vendedorId: perfil.id,
        titulo: titulo.trim(),
        reparto,
        conDomicilio: Boolean(conDomicilio),
        telefonoFijo: telefonoFijo || null,
        telefonoMovil: telefonoMovil || null,
        estado: "activo",
      },
    });

    for (const dp of datosProductos) {
      const producto = await tx.producto.create({
        data: {
          publicacionId: creada.id,
          nombre: dp.nombre,
          descripcion: dp.descripcion,
          precio: dp.precio,
          cantidad: dp.cantidad,
          categoriaId: dp.categoriaId,
          orden: dp.orden,
          estado: "activo",
        },
      });
      for (const [fIdx, foto] of dp.fotos.entries()) {
        const publicId = await subirFoto(foto);
        await tx.productoFoto.create({
          data: { productoId: producto.id, cloudinaryPublicId: publicId, orden: fIdx },
        });
      }
    }

    if (perfil.estadoSuscripcion === "demo") {
      await tx.vendedorPerfil.update({
        where: { id: perfil.id },
        data: {
          productosHoy: { increment: datosProductos.length },
          productosTotalDemo: { increment: datosProductos.length },
        },
      });
    }

    return creada;
  });

  return publicacion;
}

async function detallePublico(id) {
  return prisma.publicacion.findFirst({
    where: {
      id,
      estado: "activo",
      vendedor: { estadoSuscripcion: { in: SUSCRIPCIONES_QUE_PUEDEN_PUBLICAR } },
    },
    include: {
      vendedor: {
        include: {
          user: { select: { id: true, nombre: true, apellidos: true, reparto: true } },
          zonas: true,
        },
      },
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
}

async function marcarProducto({ userId, publicacionId, productoId, estado }) {
  const permitidos = ["vendido", "pausado", "activo"];
  if (!permitidos.includes(estado)) {
    throw Object.assign(new Error(`Estado de producto inválido (${permitidos.join(", ")})`), { status: 400 });
  }
  return prisma.$transaction(async (tx) => {
    const publicacion = await tx.publicacion.findFirst({
      where: { id: publicacionId },
      include: { vendedor: true },
    });
    if (!publicacion) {
      throw Object.assign(new Error("Publicación no encontrada"), { status: 404 });
    }
    const esAdmin = (await tx.user.findUnique({ where: { id: userId }, select: { rol: true } })).rol === "admin";
    if (publicacion.vendedor.userId !== userId && !esAdmin) {
      throw Object.assign(new Error("Solo el vendedor dueño de la publicación puede modificarla"), { status: 403 });
    }
    const existe = await tx.producto.findFirst({ where: { id: productoId, publicacionId } });
    if (!existe) {
      throw Object.assign(new Error("Producto no encontrado en esta publicación"), { status: 404 });
    }
    return tx.producto.update({ where: { id: productoId }, data: { estado } });
  });
}

async function softDelete({ userId, publicacionId }) {
  return prisma.$transaction(async (tx) => {
    const publicacion = await tx.publicacion.findFirst({
      where: { id: publicacionId },
      include: { vendedor: true },
    });
    if (!publicacion) {
      throw Object.assign(new Error("Publicación no encontrada"), { status: 404 });
    }
    const esAdmin = (await tx.user.findUnique({ where: { id: userId }, select: { rol: true } })).rol === "admin";
    if (publicacion.vendedor.userId !== userId && !esAdmin) {
      throw Object.assign(new Error("Solo el vendedor dueño de la publicación puede eliminarla"), { status: 403 });
    }
    await tx.producto.updateMany({
      where: { publicacionId },
      data: { estado: "eliminado" },
    });
    return tx.publicacion.update({
      where: { id: publicacionId },
      data: { estado: "eliminado" },
    });
  });
}

export default {
  crear,
  detallePublico,
  marcarProducto,
  softDelete,
  MAX_PRODUCTOS_POR_PUBLICACION,
  LIMITE_PRODUCTOS_POR_DIA_DEMO,
  LIMITE_PRODUCTOS_TOTAL_DEMO,
};