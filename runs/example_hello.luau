--!strict

-- Contract: each run file returns a function(context) -> ()
-- context.selection: {Instance}
-- context.changeHistory: ChangeHistoryService
-- context.studio: StudioService

return function(context)
	local folder = Instance.new("Folder")
	folder.Name = "PiBridgeExample"
	folder.Parent = workspace

	local part = Instance.new("Part")
	part.Name = "HelloPart"
	part.Size = Vector3.new(4, 1, 4)
	part.Position = Vector3.new(0, 6, 0)
	part.Anchored = true
	part.Parent = folder

	print("[PiBridge] example_hello.luau ran. Selection size:", #context.selection)
end
