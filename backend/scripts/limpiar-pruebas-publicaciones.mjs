import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const prefijos = ["panadero.", "mensajero.", "comprador."];
const usuarios = await prisma.user.findMany({
  where: { OR: prefijos.map((p) => ({ email: { startsWith: p } })) },
  select: { id: true, email: true },
});
console.log("Usuarios de prueba encontrados:", usuarios.map((u) => u.email));

for (const u of usuarios) {
  await prisma.mensaje.deleteMany({
    where: { OR: [{ remitenteId: u.id }, { destinatarioId: u.id }] },
  });

  const perfil = await prisma.vendedorPerfil.findUnique({ where: { userId: u.id } });
  if (perfil) {
    const publicaciones = await prisma.publicacion.findMany({
      where: { vendedorId: perfil.id },
      select: { id: true },
    });
    const pubIds = publicaciones.map((p) => p.id);
    const productos = await prisma.producto.findMany({
      where: { publicacionId: { in: pubIds } },
      select: { id: true },
    });
    const prodIds = productos.map((p) => p.id);

    await prisma.productoFoto.deleteMany({ where: { productoId: { in: prodIds } } });
    await prisma.producto.deleteMany({ where: { publicacionId: { in: pubIds } } });
    await prisma.publicacion.deleteMany({ where: { vendedorId: perfil.id } });
    await prisma.zonaDomicilio.deleteMany({ where: { vendedorId: perfil.id } });
    await prisma.vendedorPerfil.delete({ where: { id: perfil.id } });
    console.log(`  - Perfil vendedor borrado para ${u.email} (${pubIds.length} pub, ${prodIds.length} prod)`);
  }
  await prisma.verificacionIdentidad.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
  console.log(`  - Usuario borrado: ${u.email}`);
}

await prisma.$disconnect();
console.log("Listo.");