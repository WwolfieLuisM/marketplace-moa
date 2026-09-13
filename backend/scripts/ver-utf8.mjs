import "dotenv/config";
import prisma from "../src/lib/prisma.js";

const c = await prisma.categoria.findMany({ where: { id: { in: [6, 7, 9] } }, orderBy: { id: "asc" } });
console.log(JSON.stringify(c));
await prisma.$disconnect();