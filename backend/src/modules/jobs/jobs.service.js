import prisma from "../../lib/prisma.js";

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

async function pausarActivosDe(vendedorIds) {
  const ids = Array.isArray(vendedorIds) ? vendedorIds : [vendedorIds];
  if (ids.length === 0) return;
  await prisma.publicacion.updateMany({
    where: { vendedorId: { in: ids }, estado: "activo" },
    data: { estado: "pausado" },
  });
  await prisma.producto.updateMany({
    where: { publicacion: { vendedorId: { in: ids } }, estado: "activo" },
    data: { estado: "pausado" },
  });
}

async function borrarActivosDe(vendedorIds) {
  const ids = Array.isArray(vendedorIds) ? vendedorIds : [vendedorIds];
  if (ids.length === 0) return;
  await prisma.publicacion.updateMany({
    where: { vendedorId: { in: ids }, estado: { in: ["activo", "pausado"] } },
    data: { estado: "eliminado" },
  });
  await prisma.producto.updateMany({
    where: { publicacion: { vendedorId: { in: ids } }, estado: { in: ["activo", "pausado"] } },
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
    tokensExpurgados: 0,
  };

  const demosVencidos = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "demo",
      demoTerminaEn: { lt: ahora },
    },
    select: { id: true },
  });
  const idsDemos = demosVencidos.map((v) => v.id);
  if (idsDemos.length > 0) {
    await prisma.vendedorPerfil.updateMany({
      where: { id: { in: idsDemos } },
      data: { estadoSuscripcion: "vencido", fechaVencido: ahora },
    });
    await pausarActivosDe(idsDemos);
  }
  resumen.demosVencidos = idsDemos.length;

  const activosVencidos = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "activo",
      suscripcionVenceEn: { lt: ahora },
    },
    select: { id: true },
  });
  const idsActivos = activosVencidos.map((v) => v.id);
  if (idsActivos.length > 0) {
    await prisma.vendedorPerfil.updateMany({
      where: { id: { in: idsActivos } },
      data: { estadoSuscripcion: "vencido", fechaVencido: ahora },
    });
    await pausarActivosDe(idsActivos);
  }
  resumen.activosVencidos = idsActivos.length;

  const sinGracia = await prisma.vendedorPerfil.findMany({
    where: {
      estadoSuscripcion: "vencido",
      fechaVencido: { lt: haceSieteDias },
    },
    select: { id: true },
  });
  const idsSinGracia = sinGracia.map((v) => v.id);
  if (idsSinGracia.length > 0) {
    await borrarActivosDe(idsSinGracia);
  }
  resumen.eliminadosPorGracia = idsSinGracia.length;

  const reseteados = await prisma.vendedorPerfil.updateMany({
    where: { productosHoy: { gt: 0 } },
    data: { productosHoy: 0, ultimoResetContador: ahora },
  });
  resumen.contadoresReseteados = reseteados.count;

  const tokens = await prisma.tokenRecuperacion.deleteMany({
    where: { OR: [{ usado: true }, { expiraEn: { lt: ahora } }] },
  });
  resumen.tokensExpurgados = tokens.count;

  return resumen;
}

export default { revisarSuscripciones };