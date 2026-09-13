import prisma from "../../lib/prisma.js";
import notificacionesService from "../notificaciones/notificaciones.service.js";

const MAX_CONTENIDO = 5000;

function error(msg, status) {
  return Object.assign(new Error(msg), { status });
}

async function enviar({ userId, datos }) {
  const { destinatarioId, productoId, contenido } = datos || {};

  if (!destinatarioId) {
    throw error("Falta el destinatario", 400);
  }
  if (destinatarioId === userId) {
    throw error("No puedes enviarte mensajes a ti mismo", 400);
  }
  const texto = typeof contenido === "string" ? contenido.trim() : "";
  if (!texto) {
    throw error("El mensaje no puede estar vacío", 400);
  }
  if (texto.length > MAX_CONTENIDO) {
    throw error(`El mensaje no puede superar ${MAX_CONTENIDO} caracteres`, 400);
  }

  const remitente = await prisma.user.findUnique({
    where: { id: userId },
    select: { nombre: true, apellidos: true },
  });

  return prisma.$transaction(async (tx) => {
    const destinatario = await tx.user.findUnique({ where: { id: destinatarioId } });
    if (!destinatario || !destinatario.activo) {
      throw error("El destinatario no existe", 404);
    }

    if (productoId) {
      const producto = await tx.producto.findFirst({
        where: { id: productoId },
        include: { publicacion: { include: { vendedor: { select: { userId: true } } } } },
      });
      if (!producto || producto.estado === "eliminado") {
        throw error("El producto asociado no existe", 404);
      }
      const duenoVendedor = producto.publicacion.vendedor.userId;
      if (duenoVendedor !== userId && duenoVendedor !== destinatarioId) {
        throw error("El producto no pertenece a ninguno de los participantes", 400);
      }
    }

    const mensaje = await tx.mensaje.create({
      data: {
        remitenteId: userId,
        destinatarioId,
        productoId: productoId || null,
        contenido: texto,
        leido: false,
      },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    const remitenteNombre = remitente
      ? `${remitente.nombre} ${remitente.apellidos}`.trim()
      : "Alguien";
    const tituloCorto = texto.length > 40 ? texto.slice(0, 40) + "…" : texto;
    await tx.notificacion.create({
      data: {
        userId: destinatarioId,
        tipo: "nuevo_mensaje",
        titulo: `Nuevo mensaje de ${remitenteNombre}`,
        cuerpo: tituloCorto,
      },
    });

    return mensaje;
  }).then(async (mensaje) => {
    // Push FCM best-effort, fire-and-forget: nunca bloquea el envío del mensaje
    // ni puede romper el flujo (enviarPush ya captura sus propios errores).
    notificacionesService.enviarPush({
      userId: destinatarioId,
      titulo: `Nuevo mensaje de ${remitente ? `${remitente.nombre} ${remitente.apellidos}`.trim() : "Alguien"}`,
      cuerpo: texto.length > 40 ? texto.slice(0, 40) + "…" : texto,
    }).catch(() => {});
    return mensaje;
  });
}

async function conversaciones(userId) {
  const mensajes = await prisma.mensaje.findMany({
    where: { OR: [{ remitenteId: userId }, { destinatarioId: userId }] },
    orderBy: { creadoEn: "desc" },
    include: {
      remitente: { select: { id: true, nombre: true, apellidos: true } },
      destinatario: { select: { id: true, nombre: true, apellidos: true } },
      producto: { select: { id: true, nombre: true } },
    },
  });

  const porConversacion = new Map();
  const noLeidos = new Map();
  for (const m of mensajes) {
    const otroId = m.remitenteId === userId ? m.destinatarioId : m.remitenteId;
    const otroUsuario = m.remitenteId === userId ? m.destinatario : m.remitente;
    if (!porConversacion.has(otroId)) {
      porConversacion.set(otroId, {
        otroUsuario,
        ultimoMensaje: m,
      });
    }
    if (m.destinatarioId === userId && !m.leido) {
      noLeidos.set(otroId, (noLeidos.get(otroId) || 0) + 1);
    }
  }

  return [...porConversacion.entries()].map(([otroId, c]) => ({
    otroUsuarioId: otroId,
    otroUsuario: c.otroUsuario,
    ultimoMensaje: c.ultimoMensaje,
    noLeidos: noLeidos.get(otroId) || 0,
  }));
}

async function hilo({ userId, otroUserId }) {
  if (otroUserId === userId) {
    throw error("No puedes abrir un chat contigo mismo", 400);
  }
  const otro = await prisma.user.findUnique({ where: { id: otroUserId } });
  if (!otro) {
    throw error("El otro usuario no existe", 404);
  }

  const [mensajes] = await prisma.$transaction([
    prisma.mensaje.findMany({
      where: {
        OR: [
          { remitenteId: userId, destinatarioId: otroUserId },
          { remitenteId: otroUserId, destinatarioId: userId },
        ],
      },
      orderBy: { creadoEn: "asc" },
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true } },
        producto: { select: { id: true, nombre: true } },
      },
    }),
    prisma.mensaje.updateMany({
      where: { destinatarioId: userId, remitenteId: otroUserId, leido: false },
      data: { leido: true },
    }),
  ]);

  return {
    otroUsuario: { id: otro.id, nombre: otro.nombre, apellidos: otro.apellidos },
    mensajes,
  };
}

async function noLeidos(userId) {
  return prisma.mensaje.count({
    where: { destinatarioId: userId, leido: false },
  });
}

export default { enviar, conversaciones, hilo, noLeidos };