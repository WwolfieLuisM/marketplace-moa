import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CARPETA = "marketplace-moa/productos";

export function urlFoto(publicId) {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: "auto",
    quality: "auto",
  });
}

export async function subirFoto(dataUri) {
  const resultado = await cloudinary.uploader.upload(dataUri, {
    folder: CARPETA,
    resource_type: "image",
  });
  return resultado.public_id;
}

export default cloudinary;