import "dotenv/config";
import dns from "node:dns";
import app from "./app.js";

dns.setDefaultResultOrder("ipv4first");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Marketplace Moa backend escuchando en http://localhost:${PORT}`);
});