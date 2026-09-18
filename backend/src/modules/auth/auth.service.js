import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import prisma from "../../lib/prisma.js";
import { validarPassword } from "./password.js";
import { enviarCorreoRecuperacion } from "../../lib/mailer.js";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";
const TOKEN_RECUPERACION_TTL_MIN = 30;
const MENSAJE_OLVIDE =
  "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    apellidos: user.apellidos,
    email: user.email,
    telefono: user.telefono,
    reparto: user.reparto,
    rol: user.rol,
    authProvider: user.authProvider,
    activo: user.activo,
  };
}

async function register({ nombre, apellidos, email, telefono, password, reparto }) {
  if (!nombre || !apellidos || !email || !password) {
    throw Object.assign(new Error("Faltan campos obligatorios"), { status: 400 });
  }
  const emailNormalizado = email.trim().toLowerCase();

  validarPassword(password, { email: emailNormalizado, nombre });

  const existe = await prisma.user.findFirst({
    where: { OR: [{ email: emailNormalizado }, { telefono: telefono || undefined }] },
  });
  if (existe) {
    throw Object.assign(new Error("Ya existe una cuenta con ese email o teléfono"), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      nombre,
      apellidos,
      email: emailNormalizado,
      telefono: telefono || null,
      passwordHash,
      authProvider: "local",
      reparto: reparto || null,
      rol: "usuario",
    },
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { user: publicUser(user), accessToken, refreshToken };
}

async function login({ cuenta, password }) {
  if (!cuenta || !password) {
    throw Object.assign(new Error("Faltan email/teléfono o contraseña"), { status: 400 });
  }
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: cuenta.trim().toLowerCase() }, { telefono: cuenta }] },
  });
  if (!user || !user.passwordHash) {
    throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
  }
  if (!user.activo) {
    throw Object.assign(new Error("Cuenta desactivada"), { status: 403 });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { user: publicUser(user), accessToken, refreshToken };
}

async function googleLogin({ idToken }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw Object.assign(new Error("Google OAuth no configurado"), { status: 501 });
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw Object.assign(new Error("Google no devolvió email"), { status: 400 });
  }
  const emailNormalizado = payload.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (!user) {
    const [nombre, ...apellidos] = (payload.name || emailNormalizado).split(" ");
    user = await prisma.user.create({
      data: {
        nombre: nombre || "",
        apellidos: apellidos.join(" ") || "",
        email: emailNormalizado,
        authProvider: "google",
        rol: "usuario",
      },
    });
  }
  if (!user.activo) {
    throw Object.assign(new Error("Cuenta desactivada"), { status: 403 });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { user: publicUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw Object.assign(new Error("Sin refresh token"), { status: 401 });
  }
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error("Refresh token inválido"), { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.activo) {
    throw Object.assign(new Error("Usuario no encontrado"), { status: 401 });
  }
  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  return { user: publicUser(user), accessToken, refreshToken: newRefreshToken };
}

async function me(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  }
  return publicUser(user);
}

// Actualiza solo datos editables del perfil (nombre, apellidos, teléfono y
// reparto). El email o la contraseña NO se cambian por aquí, y el CI jamás.
async function actualizarUsuario({ userId, datos }) {
  const { nombre, apellidos, telefono, reparto } = datos || {};
  if (!nombre?.trim() || !apellidos?.trim()) {
    throw Object.assign(new Error("Faltan nombre o apellidos"), { status: 400 });
  }

  const telefonoNuevo =
    typeof telefono === "string" && telefono.trim() ? telefono.trim() : null;
  if (telefonoNuevo) {
    const existe = await prisma.user.findFirst({
      where: { telefono: telefonoNuevo, id: { not: userId } },
      select: { id: true },
    });
    if (existe) {
      throw Object.assign(new Error("Ya existe una cuenta con ese teléfono"), { status: 409 });
    }
  }

  const repartoNuevo =
    typeof reparto === "string" && reparto.trim() ? reparto.trim() : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      telefono: telefonoNuevo,
      reparto: repartoNuevo,
    },
  });
  return publicUser(user);
}

// Recuperación de contraseña con enlace por correo (Gmail SMTP/Nodemailer).
// SIEMPRE responde el mismo mensaje genérico, exista o no la cuenta: no se
// debe revelar si el email está registrado.
async function olvidePassword({ email }) {
  const emailNormalizado = String(email || "").trim().toLowerCase();
  if (!emailNormalizado) {
    throw Object.assign(new Error("Falta el correo electrónico"), { status: 400 });
  }

  const usuario = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (usuario && usuario.authProvider === "local" && usuario.activo) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + TOKEN_RECUPERACION_TTL_MIN * 60 * 1000);
    await prisma.tokenRecuperacion.create({
      data: { userId: usuario.id, token, expiraEn },
    });

    const baseUrl =
      process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const enlace = `${baseUrl}/restablecer?token=${token}`;

    try {
      await enviarCorreoRecuperacion(usuario.email, enlace, usuario.nombre);
    } catch (e) {
      console.error("[auth] No se pudo enviar el correo de recuperación:", e);
    }
  }

  return { message: MENSAJE_OLVIDE };
}

async function restablecerPassword({ token, nuevaPassword }) {
  if (!token || !nuevaPassword) {
    throw Object.assign(new Error("Faltan el token o la nueva contraseña"), { status: 400 });
  }

  const registro = await prisma.tokenRecuperacion.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expiraEn.getTime() <= Date.now()) {
    throw Object.assign(new Error("El enlace es inválido o ya expiró. Pide uno nuevo."), {
      status: 400,
    });
  }

  const usuario = await prisma.user.findUnique({ where: { id: registro.userId } });
  if (!usuario || !usuario.activo || usuario.authProvider !== "local") {
    throw Object.assign(new Error("El enlace es inválido o ya expiró. Pide uno nuevo."), {
      status: 400,
    });
  }

  validarPassword(nuevaPassword, {
    email: usuario.email,
    nombre: usuario.nombre,
  });

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: usuario.id }, data: { passwordHash } }),
    prisma.tokenRecuperacion.update({ where: { id: registro.id }, data: { usado: true } }),
  ]);

  return { message: "Contraseña actualizada. Ya puedes iniciar sesión." };
}

export default {
  register,
  login,
  googleLogin,
  refresh,
  me,
  actualizarUsuario,
  olvidePassword,
  restablecerPassword,
};