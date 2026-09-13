import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const perfilDemo = await prisma.vendedorPerfil.findUnique({
  where: { userId: "e3bfedce-21f9-4059-b8d0-32867e4e926d" },
});

if (!perfilDemo) {
  console.error("Perfil demo no encontrado");
  process.exit(1);
}

let categoria = await prisma.categoria.findFirst({ where: { nombre: "Test Job" } });
if (!categoria) {
  categoria = await prisma.categoria.create({ data: { nombre: "Test Job" } });
}

const pub = await prisma.publicacion.create({
  data: {
    vendedorId: perfilDemo.id,
    titulo: "Publicación de prueba job",
    reparto: "Rolo Montero",
    conDomicilio: true,
    estado: "activo",
    productos: {
      create: {
        nombre: "Producto prueba job",
        descripcion: "Para validar el job diario",
        precio: 100.0,
        cantidad: 1,
        categoriaId: categoria.id,
        orden: 1,
      },
    },
  },
  include: { productos: true },
});

const vencido = new Date(Date.now() - 24 * 60 * 60 * 1000);
await prisma.vendedorPerfil.update({
  where: { id: perfilDemo.id },
  data: {
    estadoSuscripcion: "demo",
    estadoLicencia: "aprobado",
    demoTerminaEn: vencido,
    productosHoy: 3,
  },
});

console.log(JSON.stringify({ categoria: categoria.nombre, publicacionId: pub.id, productoId: pub.productos[0].id, demoTerminaEn: vencido.toISOString(), productosHoySet: 3 }, null, 2));
await prisma.$disconnect();