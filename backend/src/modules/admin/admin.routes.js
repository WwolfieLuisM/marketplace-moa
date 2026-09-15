import { Router } from "express";
import adminService from "./admin.service.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

router.get("/resumen", requireAuth, requireRoles("admin"), async (req, res, next) => {
  try {
    res.json({ resumen: await adminService.resumen() });
  } catch (e) {
    next(e);
  }
});

export default router;