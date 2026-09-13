import prisma from "../../lib/prisma.js";
import { habilitado, messaging } from "../../lib/firebase.js";

function error(msg, status) {
  return Object.assign(new Error(msg), { status });
}

// Envía el push FCM (best-effort) a los tokens del usuario. Nunca falla hacia
// el llamador: si Firebase no está o falla, solo se loguea. Limpia tokens que
// FCM reporta como inválidos (registration-token-not-found, etc.).
async function enviarPush({ userId, titulo, cuerpo, datos }) {
  if (!habilitado) return;
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { fcmToken: true },
    });
    if (tokens.length === 0) return;

    const respuestas = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.fcmToken),
      notification: { title: titulo, body: cuerpo },
      data: datos || {},
    });

    const invalidos = (respuestas.responses || [])
      .map((r, i) => ({ ok: r.success, token: tokens[i]?.fcmToken }))
      .filter((r) => r.ok === false && r.token);
    if (invalidos.length > 0) {
      await prisma.deviceToken.deleteMany({
        where: { fcmToken: { in: invalidos.map((r) => r.token) } },
      });
    }
  } catch (e) {
    console.error("Error enviando push FCM:", e.message);
  }
}

// Crea la fila de notificación únicamente (sin push). Útil cuando el llamador
// ya inserta la notificación en su propia transacción.
async function crearNotificacion({ userId, tipo, titulo, cuerpo }) {
  return prisma.notificacion.create({
    data: { userId, tipo, titulo, cuerpo },
  });
}

// Crea la notificación y dispara el push FCM. Retorna la fila creada.
async function notificar({ userId, tipo, titulo, cuerpo, datos }) {
  const notificacion = await crearNotificacion({ userId, tipo, titulo, cuerpo });
  await enviarPush({ userId, titulo, cuerpo, datos });
  return notificacion;
}

async function registrarDispositivo({ userId, fcmToken, plataforma }) {
  if (!fcmToken?.trim()) {
    throw error("Falta el token FCM", 400);
  }
  const token = fcmToken.trim();
  const existente = await prisma.deviceToken.findFirst({
    where: { userId, fcmToken: token },
  });
  if (existente) {
    return existente;
  }
  return prisma.deviceToken.create({
    data: { userId, fcmToken: token, plataforma: plataforma || "web" },
  });
}

async function eliminarDispositivo({ userId, fcmToken }) {
  if (!fcmToken?.trim()) {
    throw error("Falta el token FCM", 400);
  }
  return prisma.deviceToken.deleteMany({
    where: { userId, fcmToken: fcmToken.trim() },
  });
}

async function listar({ userId, page = 1 }) {
  const PAGE_SIZE = 20;
  const offset = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;
  const [notificaciones, total, noLeidas] = await prisma.$transaction([
    prisma.notificacion.findMany({
      where: { userId },
      orderBy: { creadoEn: "desc" },
      take: PAGE_SIZE,
      skip: offset,
    }),
    prisma.notificacion.count({ where: { userId } }),
    prisma.notificacion.count({ where: { userId, leido: false } }),
  ]);
  return { notificaciones, total, noLeidas };
}

async function marcarLeida({ userId, notificacionId }) {
  const existe = await prisma.notificacion.findFirst({
    where: { id: notificacionId, userId },
  });
  if (!existe) {
    throw error("Notificación no encontrada", 404);
  }
  return prisma.notificacion.update({
    where: { id: notificacionId },
    data: { leido: true },
  });
}

async function marcarTodasLeidas(userId) {
  return prisma.notificacion.updateMany({
    where: { userId, leido: false },
    data: { leido: true },
  });
}

async function noLeidas(userId) {
  return prisma.notificacion.count({ where: { userId, leido: false } });
}

export default {
  notificar,
  crearNotificacion,
  enviarPush,
  registrarDispositivo,
  eliminarDispositivo,
  listar,
  marcarLeida,
  marcarTodasLeidas,
  noLeidas,
};