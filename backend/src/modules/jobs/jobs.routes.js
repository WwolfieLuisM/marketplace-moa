import { Router } from "express";
import jobsService from "./jobs.service.js";

const router = Router();

function requireJobKey(req, res, next) {
  const key = process.env.JOB_SECRET_KEY;
  if (!key || req.get("X-Job-Key") !== key) {
    return res.status(401).json({ error: "Clave de job no autorizada" });
  }
  return next();
}

router.post("/revisar-suscripciones", requireJobKey, async (req, res, next) => {
  try {
    const resultado = await jobsService.revisarSuscripciones();
    res.json({ ok: true, resultado });
  } catch (e) {
    next(e);
  }
});

export default router;