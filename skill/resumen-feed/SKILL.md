---
name: resumen-feed
description: Genera un reporte simple (Word o Markdown) con estadísticas del feed: total de publicaciones activas, por categoría y por reparto, para identificar zonas/categorías con menos oferta y saber dónde reclutar vendedores. Use when el usuario pide "resumen del feed", "estadísticas del feed", "zonas con menos oferta", "categorías con menos productos" o "dónde reclutar vendedores" en Marketplace Moa.
---

# Resumen del feed

Reporte simple (Word `.docx` o Markdown `.md`) con estadísticas de **datos
reales** del feed para detectar oferta escasa por reparto y por categoría.

## Fuente de datos

- Cliente Prisma: `backend/src/lib/prisma.js` (export default `prisma`).
- Tablas: `publicacion` (campo `reparto`, `estado`), `producto` (campo
  `estado`, `categoriaId`), `categoria` (`nombre`).

## Cómo ejecutar

1. Crear `backend/scripts/resumen-feed.mjs`:

   ```js
   import "dotenv/config";
   import fs from "node:fs";
   import prisma from "../src/lib/prisma.js";
   ```

2. Ejecutar desde `backend` (dotenv lee `.env` del cwd):

   ```powershell
   & "C:\NODE\node-v22.20.0-win-x64\node.exe" scripts/resumen-feed.mjs
   ```

## Consultas base

Solo publicaciones/productos con `estado: "activo"`:

```js
const totalPublicaciones = await prisma.publicacion.count({ where: { estado: "activo" } });

const porReparto = await prisma.publicacion.groupBy({
  by: ["reparto"],
  where: { estado: "activo" },
  _count: { _all: true },
});

const vista = await prisma.categoria.findMany({
  include: {
    productos: {
      where: { estado: "activo" },
      select: { id: true, publicacion: { select: { reparto: true } } },
    },
  },
});
```

## Contenido del reporte

1. **Total** de publicaciones activas.
2. **Por categoría** — nombre de cada `categoria` y conteo de productos
   activos (usar `vista` de arriba; ordenar descendente).
3. **Por reparto** — de `porReparto` (ordenar descendente).
4. **Sección de oportunidad**: listar repartos con menor cantidad de
   publicaciones y categorías con menor cantidad de productos — ahí falta
   oferta y conviene reclutar vendedores.

## Formato de salida

- **Markdown**: más simple, tabla ordenada por reparto y categoría;
  guardar en `backend/reportes/resumen-feed-YYYY-MM-DD.md`. No requiere
  librerías.
- **Word**: si se pide `.docx`, usar la librería `docx` (instalar con
  `npm install docx` en `backend`) con `Paragraph`, `HeadingLevel` y
  `Table` (ver patrón en el skill `reporte-vendedores`).

## Notas

- Guardar siempre en `backend/reportes/` con la fecha en el nombre.
- Informar la ruta exacta del archivo al terminar.
- Recordar `await prisma.$disconnect()`.
- Considerar agregar `backend/reportes/` a `.gitignore`.