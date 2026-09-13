import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const perfil = await prisma.vendedorPerfil.findUnique({
  where: { userId: "e3bfedce-21f9-4059-b8d0-32867e4e926d" },
  include: { publicaciones: { include: { productos: true } } },
});

const resumen = {
  estadoSuscripcion: perfil.estadoSuscripcion,
  fechaVencido: perfil.fechaVencido,
  productosHoy: perfil.productosHoy,
  publicaciones: perfil.publicaciones.map((p) => ({ titulo: p.titulo, estado: p.estado, productos: p.productos.map((prod) => prod.estado) })),
};

console.log(JSON.stringify(resumen, null, 2));
await prisma.$disconnect();