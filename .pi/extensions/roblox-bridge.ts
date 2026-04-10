import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RUNS_DIR = path.join(process.cwd(), "runs");

function sanitizeFileName(input: string): string {
  const trimmed = input.trim().replace(/\\/g, "/").split("/").pop() ?? "run";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (safe.endsWith(".luau") || safe.endsWith(".lua")) return safe;
  return `${safe}.luau`;
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
}
