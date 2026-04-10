# Roblox workflow

- Prefer generating complete Luau run files in `runs/`.
- Each run file must return:

```luau
--!strict
return function(context)
    -- mutate game state
end
```

- Use typed Luau where practical.
- Avoid partial snippets when a full run file is requested.
