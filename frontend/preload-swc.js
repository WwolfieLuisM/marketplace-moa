const path = require("path");

function resolverSwc() {
  const nextPkg = require.resolve("next/package.json");
  return require.resolve("@next/swc-win32-x64-msvc", {
    paths: [path.dirname(nextPkg)],
  });
}

function cargar() {
  const ruta = resolverSwc();
  for (let i = 1; i <= 5; i++) {
    try {
      const binding = require(ruta);
      console.log(`[preload-swc] binding cargado en el intento ${i}`);
      return binding;
    } catch (err) {
      console.error(
        `[preload-swc] intento ${i} fallo: ${String(err.message).split("\n")[0]}`
      );
    }
  }
  console.error("[preload-swc] sin exito tras 5 intentos");
  process.exit(1);
}

if (process.platform === "win32" && process.arch === "x64") {
  cargar();
}