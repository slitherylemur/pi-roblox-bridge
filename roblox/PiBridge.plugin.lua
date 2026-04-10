--!strict

-- Minimal Roblox Studio plugin for pi-roblox-bridge.
-- Pulls latest run file from local bridge and executes it.

local HttpService = game:GetService("HttpService")
local ServerScriptService = game:GetService("ServerScriptService")
local Selection = game:GetService("Selection")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local StudioService = game:GetService("StudioService")

local BRIDGE_URL = "http://127.0.0.1:8787/pull"

type RunPayload = {
	ok: boolean,
	file: string,
	source: string,
	updatedAt: number,
}

type BridgeContext = {
	selection: { Instance },
	changeHistory: ChangeHistoryService,
	studio: StudioService,
}

type BridgeRunFn = (BridgeContext) -> any

local toolbar = plugin:CreateToolbar("Pi Bridge")
local runButton = toolbar:CreateButton("Run Latest", "Run latest Luau file from local bridge", "")

local function notify(title: string, text: string)
	print(string.format("[PiBridge] %s: %s", title, text))
end

local function fetchLatest(): RunPayload?
	local ok, response = pcall(function()
		return HttpService:GetAsync(BRIDGE_URL)
	end)

	if not ok then
		notify("Bridge error", tostring(response))
		return nil
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)

	if not decodeOk then
		notify("Decode error", tostring(decoded))
		return nil
	end

	if type(decoded) ~= "table" or decoded.ok ~= true then
		notify("Bridge error", "Unexpected payload")
		return nil
	end

	return decoded :: RunPayload
end

local function executeSource(fileName: string, source: string)
	local module = Instance.new("ModuleScript")
	module.Name = "__PiBridgeRun__" .. fileName
	module.Source = source
	module.Parent = ServerScriptService

	local okRequire, moduleValue = pcall(require, module)
	module:Destroy()

	if not okRequire then
		notify("Run failed", tostring(moduleValue))
		return
	end

	if type(moduleValue) ~= "function" then
		notify("Run failed", "Run module must return a function.")
		return
	end

	local runFn = moduleValue :: BridgeRunFn
	local context: BridgeContext = {
		selection = Selection:Get(),
		changeHistory = ChangeHistoryService,
		studio = StudioService,
	}

	local okRun, runResult = pcall(function()
		return runFn(context)
	end)

	if not okRun then
		notify("Run failed", tostring(runResult))
		return
	end

	ChangeHistoryService:SetWaypoint("PiBridge: " .. fileName)
	notify("Run success", fileName)
	if runResult ~= nil then
		print("[PiBridge] return:", runResult)
	end
end

runButton.Click:Connect(function()
	local payload = fetchLatest()
	if payload == nil then
		return
	end

	executeSource(payload.file, payload.source)
end)

print("[PiBridge] Plugin ready. Click 'Run Latest' in the Pi Bridge toolbar.")
