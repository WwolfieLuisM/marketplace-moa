import { Router } from "express";
import jwt from "jsonwebtoken";
import feedService from "./feed.service.js";
import prisma from "../../lib/prisma.js";
import { urlFoto } from "../../lib/cloudinary.js";

const router = Router();

function productosConFotosUrl(productos) {
  return (productos || []).map((p) => ({
    ...p,
    fotos: (p.fotos || []).map((f) => ({ ...f, url: urlFoto(f.cloudinaryPublicId) })),
  }));
}

async function leerRepartoUsuario(req) {
  const token =
    (req.headers.authorization?.startsWith("Bearer ") && req.headers.authorization.slice(7)) ||
    req.cookies?.access_token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { reparto: true } });
    return user?.reparto || null;
  } catch {
    return null;
  }
}

router.get("/productos", async (req, res, next) => {
  try {
    const { q, page } = req.query;
    const productos = await feedService.buscar({ q, page });
    res.json({
      productos: productos.map((p) => ({
        ...p,
        fotos: (p.fotos || []).map((f) => ({ ...f, url: urlFoto(f.cloudinaryPublicId) })),
      })),
      page: Number(page) || 1,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { reparto, categoria, orden, page } = req.query;
    const repartoUsuario = await leerRepartoUsuario(req);
    const publicaciones = await feedService.feed({
      repartoUsuario,
      repartoFiltro: reparto,
      categoriaId: categoria,
      orden,
      page,
    });
    res.json({
      feed: publicaciones.map((pub) => ({ ...pub, productos: productosConFotosUrl(pub.productos) })),
      page: Number(page) || 1,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/categorias", async (req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { id: "asc" } });
    res.json({ categorias });
  } catch (e) {
    next(e);
  }
});

export default router;