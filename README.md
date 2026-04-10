# pi-roblox-bridge

Minimal bridge: **terminal-generated Luau files** -> **run inside Roblox Studio**.

No complex protocol. The bridge simply serves the newest run file from `./runs`, and a Roblox plugin pulls + executes it.

## Why this design

- File-first workflow (easy for coding agents)
- One local HTTP endpoint (`/pull`)
- One plugin button (`Run Latest`)
- Strict contract for run files (`return function(context) ... end`)

## Project structure

- `src/index.ts` - local bridge server
- `roblox/PiBridge.plugin.lua` - Studio plugin script
- `runs/*.luau` - generated run files (what the agent writes)

## Quick start

```bash
npm install
npm run dev
```

Bridge:
- `GET /health`
- `GET /files`
- `GET /pull` (returns latest `.luau` / `.lua` from `runs/`)

## Roblox plugin install (minimal)

1. Open Roblox Studio.
2. Create a new plugin script.
3. Paste `roblox/PiBridge.plugin.lua` contents.
4. Make sure Studio can call localhost HTTP.
5. Click **Pi Bridge -> Run Latest**.

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

1. Ask your agent to create a new file in `runs/` (e.g. `runs/2026-04-10_add_spawn.luau`).
2. In Studio, click **Run Latest**.
3. Verify changes.
4. If needed, generate a new run file and run again.

## Notes

- This is intentionally minimal.
- If you want, next step can be adding "run specific file" selection in the plugin.
