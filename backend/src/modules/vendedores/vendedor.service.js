import prisma from "../../lib/prisma.js";
import { urlFoto } from "../../lib/cloudinary.js";

const TIPOS_VALIDOS = ["individual", "tcp", "empresa_estatal"];

function perfilPublico(perfil, user) {
  return {
    id: perfil.id,
    userId: perfil.userId,
    tipo: perfil.tipo,
    nombreNegocio: perfil.nombreNegocio,
    categoriaNegocio: perfil.categoriaNegocio,
    horarioAtencion: perfil.horarioAtencion,
    direccionFisica: perfil.direccionFisica,
    estadoLicencia: perfil.estadoLicencia,
    estadoSuscripcion: perfil.estadoSuscripcion,
    demoIniciaEn: perfil.demoIniciaEn,
    demoTerminaEn: perfil.demoTerminaEn,
    productosTotalDemo: perfil.productosTotalDemo,
    productosHoy: perfil.productosHoy,
    fechaVencido: perfil.fechaVencido,
    suscripcionVenceEn: perfil.suscripcionVenceEn,
    aprobadoEn: perfil.aprobadoEn,
    rol: user?.rol,
  };
}

function twoDaysFromNow() {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
}

async function solicitar({ userId, datos }) {
  const {
    tipo,
    nombre,
    apellidos,
    numeroCi,
    reparto,
    nombreNegocio,
    categoriaNegocio,
    horarioAtencion,
    direccionFisica,
  } = datos || {};

  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw Object.assign(new Error("Tipo de vendedor inválido"), { status: 400 });
  }
  if (tipo !== "individual" && !nombreNegocio) {
    throw Object.assign(new Error("El nombre del negocio es obligatorio para este tipo"), { status: 400 });
  }
  if (!numeroCi || !nombre || !apellidos) {
    throw Object.assign(new Error("Faltan nombre, apellidos o número de CI"), { status: 400 });
  }

  const existe = await prisma.vendedorPerfil.findUnique({
    where: { userId },
  });
  if (existe) {
    throw Object.assign(new Error("Ya tienes un perfil de vendedor"), { status: 409 });
  }

  const [, perfil] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { nombre, apellidos, reparto: reparto || null },
    }),
    prisma.vendedorPerfil.create({
      data: {
        userId,
        tipo,
        nombreNegocio: nombreNegocio || null,
        categoriaNegocio: categoriaNegocio || null,
        horarioAtencion: horarioAtencion || null,
        direccionFisica: direccionFisica || null,
        estadoLicencia: "pendiente",
        estadoSuscripcion: "demo",
        // Invariante: un demo siempre tiene fechas, aunque la licencia siga
        // pendiente. Si nunca se aprueba, el job puede expirarlo y limpiar.
        demoIniciaEn: new Date(),
        demoTerminaEn: twoDaysFromNow(),
      },
    }),
  ]);

  await prisma.verificacionIdentidad.upsert({
    where: { userId },
    update: { numeroCi },
    create: { userId, numeroCi },
  });

  return perfil;
}

async function miPerfil(userId) {
  const perfil = await prisma.vendedorPerfil.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!perfil) {
    throw Object.assign(new Error("No tienes perfil de vendedor"), { status: 404 });
  }
  return perfilPublico(perfil, perfil.user);
}

async function misPublicaciones(userId) {
  const perfil = await prisma.vendedorPerfil.findUnique({ where: { userId } });
  if (!perfil) {
    throw Object.assign(new Error("No tienes perfil de vendedor"), { status: 404 });
  }
  const publicaciones = await prisma.publicacion.findMany({
    where: { vendedorId: perfil.id },
    orderBy: { creadoEn: "desc" },
    include: {
      productos: {
        orderBy: { orden: "asc" },
        include: {
          categoria: { select: { id: true, nombre: true } },
          fotos: { orderBy: { orden: "asc" } },
        },
      },
    },
  });
  return publicaciones.map((pub) => ({
    ...pub,
    productos: pub.productos.map((p) => ({
      ...p,
      fotos: p.fotos.map((f) => ({ ...f, url: urlFoto(f.cloudinaryPublicId) })),
    })),
  }));
}

async function aprobar({ adminId, vendedorPerfilId, moda }) {
  const modo = moda === "exento" ? "exento" : "demo";

  if (modo === "exento") {
    const perfil = await prisma.vendedorPerfil.update({
      where: { id: vendedorPerfilId },
      data: {
        estadoLicencia: "aprobado",
        estadoSuscripcion: "exento",
        demoIniciaEn: null,
        demoTerminaEn: null,
        fechaVencido: null,
        suscripcionVenceEn: null,
        aprobadoPor: adminId,
        aprobadoEn: new Date(),
      },
    });
    return perfil;
  }

  const perfil = await prisma.vendedorPerfil.update({
    where: { id: vendedorPerfilId },
    data: {
      estadoLicencia: "aprobado",
      estadoSuscripcion: "demo",
      demoIniciaEn: new Date(),
      demoTerminaEn: twoDaysFromNow(),
      productosTotalDemo: 0,
      productosHoy: 0,
      fechaVencido: null,
      suscripcionVenceEn: null,
      aprobadoPor: adminId,
      aprobadoEn: new Date(),
    },
  });
  return perfil;
}

async function rechazar({ adminId, vendedorPerfilId }) {
  return prisma.vendedorPerfil.update({
    where: { id: vendedorPerfilId },
    data: {
      estadoLicencia: "rechazado",
      aprobadoPor: adminId,
      aprobadoEn: new Date(),
    },
  });
}

async function listarAdmin({ estadoLicencia, estadoSuscripcion }) {
  return prisma.vendedorPerfil.findMany({
    where: {
      ...(estadoLicencia ? { estadoLicencia } : {}),
      ...(estadoSuscripcion ? { estadoSuscripcion } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          telefono: true,
          reparto: true,
          rol: true,
          activo: true,
          creadoEn: true,
          verificacionIdentidad: true,
        },
      },
    },
    orderBy: { aprobadoEn: "desc" },
  });
}

async function detalleAdmin(vendedorPerfilId) {
  const perfil = await prisma.vendedorPerfil.findUnique({
    where: { id: vendedorPerfilId },
    include: {
      user: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          telefono: true,
          reparto: true,
          rol: true,
          activo: true,
          creadoEn: true,
          verificacionIdentidad: true,
        },
      },
    },
  });
  if (!perfil) {
    throw Object.assign(new Error("Perfil de vendedor no encontrado"), { status: 404 });
  }
  return perfil;
}

async function detallePublico(userId) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(userId)) {
    throw Object.assign(new Error("Vendedor no encontrado"), { status: 404 });
  }
  const perfil = await prisma.vendedorPerfil.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, nombre: true, apellidos: true, reparto: true, telefono: true },
      },
      zonas: true,
    },
  });
  if (!perfil || perfil.estadoLicencia !== "aprobado") {
    throw Object.assign(new Error("Vendedor no encontrado"), { status: 404 });
  }
  const publicaciones = await prisma.publicacion.findMany({
    where: { vendedorId: perfil.id, estado: "activo" },
    orderBy: { creadoEn: "desc" },
    include: {
      vendedor: {
        include: { user: { select: { nombre: true, apellidos: true } } },
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
  return {
    perfil: {
      id: perfil.id,
      userId: perfil.userId,
      tipo: perfil.tipo,
      nombre: perfil.user.nombre,
      apellidos: perfil.user.apellidos,
      reparto: perfil.user.reparto,
      telefono: perfil.user.telefono,
      nombreNegocio: perfil.nombreNegocio,
      categoriaNegocio: perfil.categoriaNegocio,
      horarioAtencion: perfil.horarioAtencion,
      direccionFisica: perfil.direccionFisica,
      zonas: perfil.zonas,
    },
    publicaciones: publicaciones.map((pub) => ({
      ...pub,
      productos: pub.productos.map((p) => ({
        ...p,
        fotos: p.fotos.map((f) => ({ ...f, url: urlFoto(f.cloudinaryPublicId) })),
      })),
    })),
  };
}

export default { solicitar, miPerfil, misPublicaciones, aprobar, rechazar, listarAdmin, detalleAdmin, detallePublico };