import path from "node:path";
import type { NextConfig } from "next";

// El frontend vive en frontend/ dentro del repo; al trazar dependencias para
// el build, apuntar a la raíz del workspace evita el warning de workspace root
// de Next y asegura que archivos del repo (ej. .env) entren en el trazo.
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;