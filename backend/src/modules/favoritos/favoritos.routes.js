import { Router } from "express";
import favoritosService from "./favoritos.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/ids", requireAuth, async (req, res, next) => {
  try {
    const ids = await favoritosService.ids(req.user.sub);
    res.json({ ids });
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const productos = await favoritosService.listar({ userId: req.user.sub });
    res.json({ productos });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const favorito = await favoritosService.agregar({
      userId: req.user.sub,
      productoId: req.body?.productoId,
    });
    res.status(201).json({ favorito });
  } catch (e) {
    next(e);
  }
});

router.delete("/:productoId", requireAuth, async (req, res, next) => {
  try {
    const resultado = await favoritosService.quitar({
      userId: req.user.sub,
      productoId: req.params.productoId,
    });
    res.json(resultado);
  } catch (e) {
    next(e);
  }
});

export default router;