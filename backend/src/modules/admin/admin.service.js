import prisma from "../../lib/prisma.js";

async function resumen() {
  const [
    usuarios,
    vendedores,
    vendedoresPendientes,
    licenciasActivas,
    publicaciones,
    productos,
    mensajes,
    favoritos,
    reportes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendedorPerfil.count(),
    prisma.vendedorPerfil.count({ where: { estadoLicencia: "pendiente" } }),
    prisma.vendedorPerfil.count({ where: { estadoLicencia: "aprobado" } }),
    prisma.publicacion.count(),
    prisma.producto.count(),
    prisma.mensaje.count(),
    prisma.favorito.count(),
    prisma.reporte.count(),
  ]);

  return {
    usuarios,
    vendedores,
    vendedoresPendientes,
    licenciasActivas,
    publicaciones,
    productos,
    mensajes,
    favoritos,
    reportes,
  };
}

export default { resumen };