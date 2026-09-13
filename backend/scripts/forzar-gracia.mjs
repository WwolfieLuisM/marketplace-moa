import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const haceOchoDias = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

await prisma.vendedorPerfil.update({
  where: { userId: "e3bfedce-21f9-4059-b8d0-32867e4e926d" },
  data: { estadoSuscripcion: "vencido", fechaVencido: haceOchoDias },
});

const perfil = await prisma.vendedorPerfil.findUnique({
  where: { userId: "e3bfedce-21f9-4059-b8d0-32867e4e926d" },
  select: { estadoSuscripcion: true, fechaVencido: true },
});

console.log(JSON.stringify({ estado: perfil.estadoSuscripcion, fechaVencido: perfil.fechaVencido.toISOString() }, null, 2));
await prisma.$disconnect();