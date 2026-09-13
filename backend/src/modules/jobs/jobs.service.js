import prisma from "../../lib/prisma.js";

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

async function pausarActivosDe(vendedorId) {
  await prisma.publicacion.updateMany({
    where: { vendedorId, estado: "activo" },
    data: { estado: "pausado" },
  });
  await prisma.producto.updateMany({
    where: { publicacion: { vendedorId }, estado: "activo" },
    data: { estado: "pausado" },
  });
}

async function borrarActivosDe(vendedorId) {
  await prisma.publicacion.updateMany({
    where: { vendedorId, estado: { in: ["activo", "pausado"] } },
    data: { estado: "eliminado" },
  });
  await prisma.producto.updateMany({
    where: { publicacion: { vendedorId }, estado: { in: ["activo", "pausado"] } },
    data: { estado: "eliminado" },
  });
}

async function revisarSuscripciones() {
  const ahora = new Date();
  const haceSieteDias = new Date(Date.now() - SIETE_DIAS);
  const resumen = {
    demosVencidos: 0,
    activosVencidos: 0,
    eliminadosPorGracia: 0,
    contadoresReseteados: 0,
  };

  const demosVencidos = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "demo",
      demoTerminaEn: { lt: ahora },
    },
    select: { id: true },
  });
  for (const v of demosVencidos) {
    await prisma.vendedorPerfil.update({
      where: { id: v.id },
      data: { estadoSuscripcion: "vencido", fechaVencido: ahora },
    });
    await pausarActivosDe(v.id);
  }
  resumen.demosVencidos = demosVencidos.length;

  const activosVencidos = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "activo",
      suscripcionVenceEn: { lt: ahora },
    },
    select: { id: true },
  });
  for (const v of activosVencidos) {
    await prisma.vendedorPerfil.update({
      where: { id: v.id },
      data: { estadoSuscripcion: "vencido", fechaVencido: ahora },
    });
    await pausarActivosDe(v.id);
  }
  resumen.activosVencidos = activosVencidos.length;

  const sinGracia = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "vencido",
      fechaVencido: { lt: haceSieteDias },
    },
    select: { id: true },
  });
  for (const v of sinGracia) {
    await borrarActivosDe(v.id);
  }
  resumen.eliminadosPorGracia = sinGracia.length;

  const reseteados = await prisma.vendedorPerfil.updateMany({
    where: { productosHoy: { gt: 0 } },
    data: { productosHoy: 0, ultimoResetContador: ahora },
  });
  resumen.contadoresReseteados = reseteados.count;

  return resumen;
}

export default { revisarSuscripciones };