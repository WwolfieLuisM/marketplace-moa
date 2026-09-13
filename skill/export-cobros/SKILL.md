---
name: export-cobros
description: Exporta a Excel (.xlsx) la lista de vendedores con estado_suscripcion y suscripcion_vence_en, ordenados por urgencia de cobro (vencidos primero, luego los que vencen en los próximos 3 días). Use when el usuario pide "exportar cobros", "excel de cobros", "lista de cobro", "urgencia de pago" o "quién tiene que pagar" en Marketplace Moa.
---

# Exportación de cobros a Excel

Genera un `.xlsx` con los vendedores que hay que cobrar, a partir de datos
**reales** de la BD (Neon, vía Prisma).

## Fuente de datos

- Cliente Prisma: `backend/src/lib/prisma.js` (export default `prisma`).
- Tabla `vendedorPerfil`: `estadoSuscripcion`, `suscripcionVenceEn`,
  `fechaVencido`, `ultimoPagoEn`, `nombreNegocio`, `tipo`.
- Relación `user` para datos de contacto (nombre, apellidos, email, `telefono`).

## Cómo ejecutar

1. Crear `backend/scripts/exportar-cobros.mjs`:

   ```js
   import "dotenv/config";
   import prisma from "../src/lib/prisma.js";
   ```

2. Ejecutar desde `backend` (dotenv lee `.env` del cwd):

   ```powershell
   & "C:\NODE\node-v22.20.0-win-x64\node.exe" scripts/exportar-cobros.mjs
   ```

## Consulta base

Construir límites de fecha con cuidado de la zona horaria: `suscripcionVenceEn`
es `@db.Date`, comparar contra medianoche local.

```js
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const en3Dias = new Date(hoy.getTime() + 3 * 86400000);

const vendedores = await prisma.vendedorPerfil.findMany({
  where: {
    OR: [
      { estadoSuscripcion: "vencido" },
      { suscripcionVenceEn: { gte: hoy, lte: en3Dias } },
    ],
  },
  include: {
    user: { select: { nombre: true, apellidos: true, email: true, telefono: true } },
  },
});
```

## Orden de urgencia

1. **Vencidos primero** (`estadoSuscripcion: "vencido"`), por `fechaVencido`
   ascendente (los de más tiempo primero).
2. **Próximos 3 días** después, por `suscripcionVenceEn` ascendente.

```js
vendedores.sort((a, b) => {
  const u = a.estadoSuscripcion === "vencido" ? 0 : 1;
  const v = b.estadoSuscripcion === "vencido" ? 0 : 1;
  if (u !== v) return u - v;
  const da = a.estadoSuscripcion === "vencido" ? a.fechaVencido : a.suscripcionVenceEn;
  const db = b.estadoSuscripcion === "vencido" ? b.fechaVencido : b.suscripcionVenceEn;
  return new Date(da || 0) - new Date(db || 0);
});
```

## Columnas del Excel

`Nombre`, `Teléfono`, `Email`, `Nombre del negocio`, `Tipo`,
`Estado suscripción`, `Vence en` (o `Fecha vencido` para los vencidos),
`Último pago`, `Urgencia` (texto/código de color).

## Librería y salida

No está instalada aún; instalar en `backend`: `npm install exceljs`.

```js
import ExcelJS from "exceljs";
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Cobros");
ws.columns = [/* nombre + header por columna */];
for (const v of vendedores) ws.addRow([/* valores */]);
fs.mkdirSync("reportes", { recursive: true });
await wb.xlsx.writeFile("reportes/cobros-YYYY-MM-DD.xlsx");
```

- Guardar siempre en `backend/reportes/` con fecha en el nombre.
- Informar la ruta exacta del archivo al terminar.
- Recordar `await prisma.$disconnect()`.
- Considerar agregar `backend/reportes/` a `.gitignore`.