---
name: reporte-vendedores
description: Genera un reporte en Word (.docx) o PDF con el estado de los vendedores (activos, en demo, vencidos), vencimientos próximos para cobro y total de productos publicados por vendedor. Use when el usuario pide "reporte de vendedores", "quién vence", "a quién visitar a cobrar", "vendedores activos/vencidos" o "estado de suscripciones" en Marketplace Moa.
---

# Reporte de vendedores

Genera un reporte con datos **reales** de la BD (Neon, vía Prisma), nunca de ejemplo.

## Fuente de datos

- Cliente Prisma: `backend/src/lib/prisma.js` (export default `prisma`).
- Modelos relevantes: `vendedorPerfil`, `user`, `publicacion`, `producto`.
- Campos de suscripción en `VendedorPerfil`: `estadoSuscripcion`
  (`"demo" | "activo" | "vencido"`), `suscripcionVenceEn` (`@db.Date`),
  `demoTerminaEn`, `fechaVencido`, `ultimoPagoEn`, `productosTotalDemo`.

## Cómo ejecutar

1. Crear script en `backend/scripts/reporte-vendedores.mjs` con el patrón
   estándar del repo (ver `backend/scripts/limpiar-pruebas-publicaciones.mjs`):

   ```js
   import "dotenv/config";
   import fs from "node:fs";
   import prisma from "../src/lib/prisma.js";
   ```

2. Ejecutar desde `backend` (dotenv lee `.env` del cwd):

   ```powershell
   & "C:\NODE\node-v22.20.0-win-x64\node.exe" scripts/reporte-vendedores.mjs
   ```

## Consulta base

```js
const vendedores = await prisma.vendedorPerfil.findMany({
  include: {
    user: { select: { nombre: true, apellidos: true, email: true, telefono: true, activo: true } },
    publicaciones: {
      where: { estado: "activo" },
      include: { productos: { where: { estado: "activo" }, select: { id: true } } },
    },
  },
});
```

## Secciones del reporte

1. **Vendedores activos** — `estadoSuscripcion: "activo"`.
2. **En demo** — `estadoSuscripcion: "demo"` (mostrar `demoTerminaEn`).
3. **Vencidos** — `estadoSuscripcion: "vencido"` o `fechaVencido != null`.
4. **Vencimiento próximo (lista de cobro)** — vencidos primero y luego aquéllos
   con `suscripcionVenceEn` dentro de los próximos 7 días, ordenados por fecha
   ascendente. Es la lista "a quién visitar a cobrar" (incluye teléfono del user).
5. **Total de productos publicados por vendedor** — sumar
   `publicaciones[].productos.length` por vendedor; si está en demo usar
   `productosTotalDemo` como referencia.

## Librerías y formato de salida

Ninguna está instalada aún; instalar en `backend`:
`npm install docx pdfkit`.

- **Word (.docx)** — librería `docx`:

  ```js
  import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
  const doc = new Document({ sections: [{ children: [...] }] });
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync("reportes", { recursive: true });
  await fs.promises.writeFile("reportes/reporte-vendedores.docx", buffer);
  ```

- **PDF** — librería `pdfkit`:

  ```js
  import PDFDocument from "pdfkit";
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream("reportes/reporte-vendedores.pdf"));
  doc.fontSize(16).text("Reporte de vendedores");
  doc.end();
  ```

## Salida

- Guardar siempre en `backend/reportes/` con la fecha en el nombre:
  `reporte-vendedores-YYYY-MM-DD.docx` (o `.pdf`).
- Informar la ruta exacta del archivo generado al terminar.
- Recordar `await prisma.$disconnect()` al final.
- Considerar agregar `backend/reportes/` a `.gitignore` para no commitear
  reportes generados.