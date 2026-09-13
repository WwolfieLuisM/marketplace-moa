import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Marketplace Moa backend escuchando en http://localhost:${PORT}`);
});