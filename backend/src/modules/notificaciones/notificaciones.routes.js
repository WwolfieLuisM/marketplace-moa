import { Router } from "express";
import notificacionesService from "./notificaciones.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.post("/device-tokens", requireAuth, async (req, res, next) => {
  try {
    const dispositivo = await notificacionesService.registrarDispositivo({
      userId: req.user.sub,
      fcmToken: req.body?.fcmToken,
      plataforma: req.body?.plataforma,
    });
    res.status(201).json({ dispositivo });
  } catch (e) {
    next(e);
  }
});

router.delete("/device-tokens", requireAuth, async (req, res, next) => {
  try {
    const resultado = await notificacionesService.eliminarDispositivo({
      userId: req.user.sub,
      fcmToken: req.body?.fcmToken,
    });
    res.json({ eliminados: resultado.count });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const listado = await notificacionesService.listar({
      userId: req.user.sub,
      page: req.query.page,
    });
    res.json(listado);
  } catch (e) {
    next(e);
  }
});

router.get("/no-leidas", requireAuth, async (req, res, next) => {
  try {
    const total = await notificacionesService.noLeidas(req.user.sub);
    res.json({ noLeidas: total });
  } catch (e) {
    next(e);
  }
});

router.patch("/marcar-todas-leidas", requireAuth, async (req, res, next) => {
  try {
    const resultado = await notificacionesService.marcarTodasLeidas(req.user.sub);
    res.json({ actualizadas: resultado.count });
  } catch (e) {
    next(e);
  }
});

router.patch("/:notificacionId/leida", requireAuth, async (req, res, next) => {
  try {
    const notificacion = await notificacionesService.marcarLeida({
      userId: req.user.sub,
      notificacionId: req.params.notificacionId,
    });
    res.json({ notificacion });
  } catch (e) {
    next(e);
  }
});

export default router;