import { Router } from "express";
import vendedorService from "./vendedor.service.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

router.post("/solicitud", requireAuth, async (req, res, next) => {
  try {
    const perfil = await vendedorService.solicitar({ userId: req.user.sub, datos: req.body });
    res.status(201).json({ perfil });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    res.json({ perfil: await vendedorService.miPerfil(req.user.sub) });
  } catch (e) {
    next(e);
  }
});

router.get("/me/publicaciones", requireAuth, async (req, res, next) => {
  try {
    res.json({ publicaciones: await vendedorService.misPublicaciones(req.user.sub) });
  } catch (e) {
    next(e);
  }
});

router.get("/publico/:userId", async (req, res, next) => {
  try {
    res.json(await vendedorService.detallePublico(req.params.userId));
  } catch (e) {
    next(e);
  }
});

router.get("/", requireAuth, requireRoles("admin"), async (req, res, next) => {
  try {
    const { estadoLicencia, estadoSuscripcion } = req.query;
    const perfiles = await vendedorService.listarAdmin({ estadoLicencia, estadoSuscripcion });
    res.json({ perfiles });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, requireRoles("admin"), async (req, res, next) => {
  try {
    res.json({ perfil: await vendedorService.detalleAdmin(req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/aprobar", requireAuth, requireRoles("admin"), async (req, res, next) => {
  try {
    const perfil = await vendedorService.aprobar({
      adminId: req.user.sub,
      vendedorPerfilId: req.params.id,
      moda: req.body?.moda,
    });
    res.json({ perfil });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/rechazar", requireAuth, requireRoles("admin"), async (req, res, next) => {
  try {
    const perfil = await vendedorService.rechazar({
      adminId: req.user.sub,
      vendedorPerfilId: req.params.id,
    });
    res.json({ perfil });
  } catch (e) {
    next(e);
  }
});

export default router;