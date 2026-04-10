import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "pi-roblox-bridge", port });
});

app.listen(port, () => {
  console.log(`[bridge] listening on http://localhost:${port}`);
});
