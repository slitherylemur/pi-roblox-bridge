import express from "express";
import cors from "cors";
import { promises as fs } from "node:fs";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

const projectRoot = process.cwd();
const runsDir = path.join(projectRoot, "runs");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function ensureRunsDir(): Promise<void> {
  await fs.mkdir(runsDir, { recursive: true });
}

function isLuauFile(name: string): boolean {
  return name.endsWith(".luau") || name.endsWith(".lua");
}

async function getLatestRunFile(): Promise<{ file: string; source: string; updatedAt: number } | null> {
  const entries = await fs.readdir(runsDir, { withFileTypes: true });

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isLuauFile(entry.name))
      .map(async (entry) => {
        const absolute = path.join(runsDir, entry.name);
        const stat = await fs.stat(absolute);
        return {
          absolute,
          file: entry.name,
          updatedAt: stat.mtimeMs,
        };
      }),
  );

  if (files.length === 0) return null;

  files.sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = files[0];
  const source = await fs.readFile(latest.absolute, "utf8");

  return {
    file: latest.file,
    source,
    updatedAt: latest.updatedAt,
  };
}

app.get("/health", async (_req, res) => {
  await ensureRunsDir();
  res.json({
    ok: true,
    name: "pi-roblox-bridge",
    host,
    port,
    runsDir,
  });
});

app.get("/files", async (_req, res) => {
  await ensureRunsDir();

  const entries = await fs.readdir(runsDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isLuauFile(entry.name))
      .map(async (entry) => {
        const stat = await fs.stat(path.join(runsDir, entry.name));
        return {
          file: entry.name,
          updatedAt: stat.mtimeMs,
        };
      }),
  );

  files.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ ok: true, files });
});

app.get("/pull", async (_req, res) => {
  await ensureRunsDir();

  const latest = await getLatestRunFile();
  if (!latest) {
    res.status(404).json({
      ok: false,
      error: "No .luau/.lua files found in runs/",
      hint: "Create a run file in ./runs, then pull again.",
    });
    return;
  }

  res.json({
    ok: true,
    ...latest,
  });
});

app.get("/command-bar", (_req, res) => {
  const snippet = [
    'local HttpService = game:GetService("HttpService")',
    `local response = HttpService:GetAsync("http://${host}:${port}/pull")`,
    "print(response)",
  ].join("\n");

  res.type("text/plain").send(snippet);
});

await ensureRunsDir();
app.listen(port, host, () => {
  console.log(`[bridge] listening on http://${host}:${port}`);
  console.log(`[bridge] watching run files in: ${runsDir}`);
});
