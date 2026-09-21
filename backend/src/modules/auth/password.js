export const CLAVES_DEBILES = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "contraseña",
  "11111111",
  "22222222",
  "87654321",
  "qwerty123",
  "qwertyuiop",
  "abcdefgh",
  "admin123",
  "marketplace",
  "marketplacemoa",
  "moa12345",
  "usuario123",
]);

const ERROR_CORTA = "La contraseña debe tener al menos 8 caracteres";
const ERROR_COMUN = "Esa contraseña es muy común, elige otra";
const ERROR_REPETIDA = "La contraseña no puede ser igual a tu email o nombre";

export function validarPassword(password, { email, nombre } = {}) {
  if (!password || password.length < 8) {
    throw Object.assign(new Error(ERROR_CORTA), { status: 400 });
  }
  const minus = password.toLowerCase();
  if (CLAVES_DEBILES.has(password) || CLAVES_DEBILES.has(minus)) {
    throw Object.assign(new Error(ERROR_COMUN), { status: 400 });
  }
  const referencia = [email, nombre]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());
  if (referencia.some((ref) => ref && minus === ref)) {
    throw Object.assign(new Error(ERROR_REPETIDA), { status: 400 });
  }
}