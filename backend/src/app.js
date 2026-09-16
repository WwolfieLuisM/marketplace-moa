import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import vendedorRoutes from "./modules/vendedores/vendedor.routes.js";
import publicacionRoutes from "./modules/publicaciones/publicaciones.routes.js";
import feedRoutes from "./modules/feed/feed.routes.js";
import mensajesRoutes from "./modules/mensajes/mensajes.routes.js";
import notificacionesRoutes from "./modules/notificaciones/notificaciones.routes.js";
import favoritosRoutes from "./modules/favoritos/favoritos.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import jobRoutes from "./modules/jobs/jobs.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { habilitado as firebaseHabilitado } from "./lib/firebase.js";

const app = express();

const origenesPermitidos = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origen no permitido por CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    servicio: "marketplace-moa-backend",
    firebase: firebaseHabilitado,
  });
});

app.use("/auth", authRoutes);
app.use("/vendedores", vendedorRoutes);
app.use("/publicaciones", publicacionRoutes);
app.use("/feed", feedRoutes);
app.use("/mensajes", mensajesRoutes);
app.use("/notificaciones", notificacionesRoutes);
app.use("/favoritos", favoritosRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/jobs", jobRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;