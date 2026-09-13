import { Router } from "express";
import publicacionesService from "./publicaciones.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { urlFoto } from "../../lib/cloudinary.js";

const router = Router();

function fotoUrl(foto) {
  return urlFoto(foto.cloudinaryPublicId);
}

function productosConFotosUrl(productos) {
  return (productos || []).map((p) => ({
    ...p,
    fotos: (p.fotos || []).map((f) => ({ ...f, url: fotoUrl(f) })),
  }));
}

function publicacionConFotosUrl(pub) {
  if (!pub) return pub;
  return { ...pub, productos: productosConFotosUrl(pub.productos) };
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const publicacion = await publicacionesService.crear({
      userId: req.user.sub,
      datos: req.body,
    });
    res.status(201).json({ publicacion });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const publicacion = await publicacionesService.detallePublico(req.params.id);
    if (!publicacion) {
      return res.status(404).json({ error: "Publicación no encontrada" });
    }
    res.json({ publicacion: publicacionConFotosUrl(publicacion) });
  } catch (e) {
    next(e);
  }
});

router.patch("/:publicacionId/productos/:productoId", requireAuth, async (req, res, next) => {
  try {
    const producto = await publicacionesService.marcarProducto({
      userId: req.user.sub,
      publicacionId: req.params.publicacionId,
      productoId: req.params.productoId,
      estado: req.body?.estado,
    });
    res.json({ producto });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const publicacion = await publicacionesService.softDelete({
      userId: req.user.sub,
      publicacionId: req.params.id,
    });
    res.json({ publicacion });
  } catch (e) {
    next(e);
  }
});

export default router;