import express from "express";
import cors from "cors";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

const runsDir = path.join(process.cwd(), "runs");

type JobStatus = "pending" | "running" | "done" | "failed";

type Job = {
  id: string;
  file: string;
  source: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  output?: string;
  error?: string;
  returnValue?: string;
};

const jobs = new Map<string, Job>();
const queue: string[] = [];

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function now(): number {
  return Date.now();
}

function sanitizeFileName(input: string): string {
  const trimmed = input.trim().replace(/\\/g, "/").split("/").pop() ?? "run";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (safe.endsWith(".luau") || safe.endsWith(".lua")) return safe;
  return `${safe}.luau`;
}

async function ensureRunsDir(): Promise<void> {
  await fs.mkdir(runsDir, { recursive: true });
}

app.get("/health", async (_req, res) => {
  await ensureRunsDir();
  res.json({ ok: true, host, port, runsDir, queued: queue.length, jobs: jobs.size });
});

app.post("/agent/run", async (req, res) => {
  const fileName = typeof req.body?.fileName === "string" ? sanitizeFileName(req.body.fileName) : "run.luau";
  const source = typeof req.body?.source === "string" ? req.body.source : "";

  if (!source.trim()) {
    res.status(400).json({ ok: false, error: "source is required" });
    return;
  }

  await ensureRunsDir();
  await fs.writeFile(path.join(runsDir, fileName), source, "utf8");

  const id = randomUUID();
  const createdAt = now();
  const job: Job = {
    id,
    file: fileName,
    source,
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };

  jobs.set(id, job);
  queue.push(id);

  res.json({ ok: true, id, file: fileName });
});

app.get("/agent/result/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ ok: false, error: "job not found" });
    return;
  }

  res.json({ ok: true, job });
});

app.get("/plugin/next", (_req, res) => {
  while (queue.length > 0) {
    const id = queue.shift()!;
    const job = jobs.get(id);
    if (!job) continue;
    if (job.status !== "pending") continue;

    job.status = "running";
    job.updatedAt = now();

    res.json({ ok: true, job: { id: job.id, file: job.file, source: job.source } });
    return;
  }

  res.status(204).send();
});

app.post("/plugin/result", (req, res) => {
  const id = typeof req.body?.id === "string" ? req.body.id : "";
  const ok = req.body?.ok === true;

  const job = jobs.get(id);
  if (!job) {
    res.status(404).json({ ok: false, error: "job not found" });
    return;
  }

  job.status = ok ? "done" : "failed";
  job.updatedAt = now();
  if (typeof req.body?.output === "string") job.output = req.body.output;
  if (typeof req.body?.error === "string") job.error = req.body.error;
  if (typeof req.body?.returnValue === "string") job.returnValue = req.body.returnValue;

  res.json({ ok: true });
});

await ensureRunsDir();
app.listen(port, host, () => {
  console.log(`[bridge] listening on http://${host}:${port}`);
  console.log(`[bridge] runs dir: ${runsDir}`);
});
