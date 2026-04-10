# pi-roblox-bridge

Minimal bridge: **terminal-generated Luau files** -> **auto-run inside Roblox Studio**.

No complex protocol. Agent submits a run job, plugin polls bridge, executes automatically, and posts result back.

## Why this design

- File-first workflow (easy for coding agents)
- One local HTTP endpoint (`/pull`)
- One plugin button (`Run Latest`)
- Strict contract for run files (`return function(context) ... end`)

## Project structure

- `src/index.ts` - local bridge server (job queue + result API)
- `roblox/PiBridge.plugin.lua` - Studio plugin script (autonomous polling)
- `runs/*.luau` - generated run files (archived run payloads)

## Quick start

```bash
npm install
npm run dev
```

Bridge:
- `GET /health`
- `POST /agent/run` (enqueue run)
- `GET /agent/result/:id` (poll run result)
- `GET /plugin/next` (plugin gets next job)
- `POST /plugin/result` (plugin posts completion)

## Roblox plugin install (minimal)

1. Put `roblox/PiBridge.plugin.lua` in `%LOCALAPPDATA%/Roblox/Plugins`.
2. Open Roblox Studio.
3. Ensure local HTTP is allowed in Studio.
4. Plugin auto-polls every second (no button click required).

## Run file contract (important)

Each run file must return a function:

```lua
--!strict

return function(context)
    -- mutate game here
    -- context.selection: {Instance}
    -- context.changeHistory: ChangeHistoryService
    -- context.studio: StudioService
end
```

If a file does not return a function, plugin execution is rejected.

## Example

`runs/example_hello.luau` is included.

## Typical terminal workflow

1. Ask agent to call `roblox_run_file` with full Luau source.
2. Bridge queues run.
3. Studio plugin auto-executes.
4. Agent receives success/failure + return value.

## Notes

- This is intentionally minimal.
- If you want, next step can be adding "run specific file" selection in the plugin.
