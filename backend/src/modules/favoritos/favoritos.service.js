import prisma from "../../lib/prisma.js";
import { urlFoto } from "../../lib/cloudinary.js";

async function listar({ userId }) {
  const favoritos = await prisma.favorito.findMany({
    where: { userId, producto: { estado: "activo" } },
    orderBy: { creadoEn: "desc" },
    include: {
      producto: {
        include: {
          publicacion: {
            include: {
              vendedor: { include: { user: { select: { nombre: true, apellidos: true } } } },
            },
          },
          categoria: { select: { id: true, nombre: true } },
          fotos: { orderBy: { orden: "asc" } },
        },
      },
    },
  });

  return favoritos.map((f) => ({
    ...f.producto,
    favoritoId: f.id,
    favoritoCreadoEn: f.creadoEn,
    fotos: (f.producto.fotos || []).map((ft) => ({
      ...ft,
      url: urlFoto(ft.cloudinaryPublicId),
    })),
  }));
}

async function ids(userId) {
  const favoritos = await prisma.favorito.findMany({
    where: { userId },
    select: { productoId: true },
  });
  return favoritos.map((f) => f.productoId);
}

async function agregar({ userId, productoId }) {
  if (!productoId) {
    throw Object.assign(new Error("Falta el producto"), { status: 400 });
  }
  const producto = await prisma.producto.findFirst({
    where: { id: productoId, estado: "activo", publicacion: { estado: "activo" } },
    select: { id: true },
  });
  if (!producto) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  }
  return prisma.favorito.upsert({
    where: { userId_productoId: { userId, productoId } },
    update: {},
    create: { userId, productoId },
  });
}

async function quitar({ userId, productoId }) {
  if (!productoId) {
    throw Object.assign(new Error("Falta el producto"), { status: 400 });
  }
  await prisma.favorito.deleteMany({ where: { userId, productoId } });
  return { ok: true };
}

export default { listar, ids, agregar, quitar };