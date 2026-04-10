--!strict

-- Autonomous Pi Bridge plugin.
-- Polls local bridge for jobs, executes them, posts result back.

local HttpService = game:GetService("HttpService")
local ServerScriptService = game:GetService("ServerScriptService")
local Selection = game:GetService("Selection")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local StudioService = game:GetService("StudioService")

local BASE_URL = "http://127.0.0.1:8787"
local NEXT_URL = BASE_URL .. "/plugin/next"
local RESULT_URL = BASE_URL .. "/plugin/result"

type NextJob = {
	id: string,
	file: string,
	source: string,
}

type BridgeContext = {
	selection: { Instance },
	changeHistory: ChangeHistoryService,
	studio: StudioService,
}

type BridgeRunFn = (BridgeContext) -> any

local function postResult(id: string, ok: boolean, err: string?, returnValue: string?)
	local payload = {
		id = id,
		ok = ok,
		error = err,
		returnValue = returnValue,
	}

	local body = HttpService:JSONEncode(payload)
	local success, postErr = pcall(function()
		HttpService:PostAsync(RESULT_URL, body, Enum.HttpContentType.ApplicationJson, false)
	end)

	if not success then
		warn("[PiBridge] Failed to post result:", postErr)
	end
end

local function executeJob(job: NextJob)
	local module = Instance.new("ModuleScript")
	module.Name = "__PiBridgeRun__" .. job.file
	module.Source = job.source
	module.Parent = ServerScriptService

	local okRequire, moduleValue = pcall(require, module)
	module:Destroy()

	if not okRequire then
		postResult(job.id, false, tostring(moduleValue), nil)
		warn("[PiBridge] require failed for", job.file, moduleValue)
		return
	end

	if type(moduleValue) ~= "function" then
		postResult(job.id, false, "run module must return function(context)", nil)
		warn("[PiBridge] run file must return function(context):", job.file)
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
		postResult(job.id, false, tostring(runResult), nil)
		warn("[PiBridge] run failed for", job.file, runResult)
		return
	end

	ChangeHistoryService:SetWaypoint("PiBridge: " .. job.file)
	local returnText: string? = nil
	if runResult ~= nil then
		returnText = tostring(runResult)
		print("[PiBridge] return:", returnText)
	end

	postResult(job.id, true, nil, returnText)
	print("[PiBridge] run success:", job.file)
end

local function pollOnce()
	local ok, response = pcall(function()
		return HttpService:GetAsync(NEXT_URL)
	end)

	if not ok then
		return
	end

	if response == nil or response == "" then
		return
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response)
	end)

	if not decodeOk or type(decoded) ~= "table" then
		return
	end

	if decoded.ok ~= true or type(decoded.job) ~= "table" then
		return
	end

	local job = decoded.job :: NextJob
	executeJob(job)
end

task.spawn(function()
	print("[PiBridge] autonomous mode active")
	while true do
		pollOnce()
		task.wait(1)
	end
end)
