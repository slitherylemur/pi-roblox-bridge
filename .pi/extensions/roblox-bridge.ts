import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const BASE_URL = process.env.ROBLOX_BRIDGE_URL ?? "http://127.0.0.1:8787";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "roblox_run_file",
    label: "Roblox Run File",
    description:
      "Send a full Luau run file to local bridge, wait for Roblox Studio plugin execution result, and return status.",
    promptSnippet: "Run complete Luau files in Roblox Studio via local bridge without manual Studio clicks.",
    promptGuidelines: [
      "Prefer this tool when the user asks to apply Roblox changes.",
      "Source must be a complete run file that returns function(context).",
      "Use --!strict and typed Luau where practical.",
    ],
    parameters: Type.Object({
      fileName: Type.String({ description: "Run file name, e.g. 2026-04-10_add_spawn.luau" }),
      source: Type.String({ description: "Complete Luau source returning function(context)." }),
      timeoutSeconds: Type.Optional(Type.Number({ description: "Wait timeout for Studio execution", default: 60 })),
    }),
    async execute(_toolCallId, params) {
      const timeoutSeconds = Math.max(5, Math.min(300, Math.floor(params.timeoutSeconds ?? 60)));

      const enqueueResponse = await fetch(`${BASE_URL}/agent/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: params.fileName, source: params.source }),
      }).catch((error) => {
        throw new Error(`Bridge not reachable at ${BASE_URL}: ${String(error)}`);
      });

      if (!enqueueResponse.ok) {
        const text = await enqueueResponse.text();
        throw new Error(`Bridge enqueue failed (${enqueueResponse.status}): ${text}`);
      }

      const enqueueJson = (await enqueueResponse.json()) as { ok: boolean; id: string; file: string };
      const id = enqueueJson.id;
      const started = Date.now();

      while (Date.now() - started < timeoutSeconds * 1000) {
        await sleep(1000);

        const resultResponse = await fetch(`${BASE_URL}/agent/result/${id}`);
        if (!resultResponse.ok) continue;

        const resultJson = (await resultResponse.json()) as {
          ok: boolean;
          job: {
            file: string;
            status: "pending" | "running" | "done" | "failed";
            error?: string;
            returnValue?: string;
          };
        };

        const status = resultJson.job.status;
        if (status === "pending" || status === "running") continue;

        if (status === "failed") {
          return {
            content: [
              {
                type: "text",
                text: `Run failed for ${resultJson.job.file}: ${resultJson.job.error ?? "unknown error"}`,
              },
            ],
            details: { file: resultJson.job.file, status },
            isError: true,
          };
        }

        const returnValue = resultJson.job.returnValue ? `\nReturn: ${resultJson.job.returnValue}` : "";
        return {
          content: [{ type: "text", text: `Run success for ${resultJson.job.file}.${returnValue}` }],
          details: { file: resultJson.job.file, status },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Run queued but timed out after ${timeoutSeconds}s. Ensure Roblox Studio is open with PiBridge plugin loaded.`,
          },
        ],
        details: { jobId: id, timeoutSeconds },
        isError: true,
      };
    },
  });
}
