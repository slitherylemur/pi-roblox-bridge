# pi-roblox-bridge

Minimal open-source bridge between Pi agent and Roblox Studio.

## Status

Environment bootstrap complete.

## Quick start

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:8787/health
```

## Next steps

- Add endpoint to accept Pi-generated Lua file writes.
- Add endpoint to return Roblox command-log-ready script text.
- Add optional RPC mode integration with `pi --mode rpc`.
