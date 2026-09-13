import { Router } from "express";
import mensajesService from "./mensajes.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const mensaje = await mensajesService.enviar({ userId: req.user.sub, datos: req.body });
    res.status(201).json({ mensaje });
  } catch (e) {
    next(e);
  }
});

router.get("/conversaciones", requireAuth, async (req, res, next) => {
  try {
    const conversaciones = await mensajesService.conversaciones(req.user.sub);
    res.json({ conversaciones });
  } catch (e) {
    next(e);
  }
});

router.get("/no-leidos", requireAuth, async (req, res, next) => {
  try {
    const total = await mensajesService.noLeidos(req.user.sub);
    res.json({ noLeidos: total });
  } catch (e) {
    next(e);
  }
});

router.get("/conversaciones/:otroUserId", requireAuth, async (req, res, next) => {
  try {
    const conversacion = await mensajesService.hilo({ userId: req.user.sub, otroUserId: req.params.otroUserId });
    res.json({ conversacion });
  } catch (e) {
    next(e);
  }
});

export default router;