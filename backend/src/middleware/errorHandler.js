export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: "No existe esta ruta" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
}