import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const RUNS_DIR = path.join(process.cwd(), "runs");

function sanitizeFileName(input: string): string {
  const trimmed = input.trim().replace(/\\/g, "/").split("/").pop() ?? "run";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (safe.endsWith(".luau") || safe.endsWith(".lua")) return safe;
  return `${safe}.luau`;
}

async function getLatestRun(): Promise<{ file: string; source: string } | null> {
  await mkdir(RUNS_DIR, { recursive: true });
  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((e) => e.isFile() && (e.name.endsWith(".luau") || e.name.endsWith(".lua")))
      .map(async (e) => {
        const absolute = path.join(RUNS_DIR, e.name);
        const info = await stat(absolute);
        return { file: e.name, absolute, mtime: info.mtimeMs };
      }),
  );

  if (files.length === 0) return null;
  files.sort((a, b) => b.mtime - a.mtime);
  const latest = files[0];
  const source = await readFile(latest.absolute, "utf8");
  return { file: latest.file, source };
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "roblox_write_run_file",
    label: "Roblox Write Run File",
    description: "Write a full Luau run file into ./runs for PiBridge plugin to execute in Roblox Studio.",
    promptSnippet: "Create a complete Luau run file under runs/ that the PiBridge plugin can execute.",
    promptGuidelines: [
      "When changing a Roblox project, prefer this tool and output a complete run file.",
      "Run files must return: return function(context) ... end",
      "Use --!strict and typed Luau where practical.",
    ],
    parameters: Type.Object({
      fileName: Type.String({ description: "File name for runs/, e.g. 2026-04-10_add_npc.luau" }),
      source: Type.String({ description: "Complete Luau source. Must return function(context) ... end" }),
    }),
    async execute(_toolCallId, params) {
      await mkdir(RUNS_DIR, { recursive: true });
      const fileName = sanitizeFileName(params.fileName);
      const absolute = path.join(RUNS_DIR, fileName);
      await writeFile(absolute, params.source, "utf8");

      return {
        content: [
          { type: "text", text: `Wrote run file: runs/${fileName}\nNow click 'Pi Bridge -> Run Latest' in Roblox Studio.` },
        ],
        details: { file: `runs/${fileName}` },
      };
    },
  });

  pi.registerTool({
    name: "roblox_read_latest_run_file",
    label: "Roblox Read Latest Run File",
    description: "Read the newest run file from ./runs.",
    parameters: Type.Object({}),
    async execute() {
      const latest = await getLatestRun();
      if (!latest) {
        return { content: [{ type: "text", text: "No run files found in ./runs" }], details: {} };
      }

      return {
        content: [{ type: "text", text: `Latest: runs/${latest.file}\n\n${latest.source}` }],
        details: { file: `runs/${latest.file}` },
      };
    },
  });
}
