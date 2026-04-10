# Roblox workflow

- Use `roblox_run_file` to apply Roblox changes.
- Do not ask user to click a run button when autonomous mode is expected.
- Source should be a complete run file:

```luau
--!strict
return function(context)
    -- mutate game state
end
```

- Use typed Luau where practical.
