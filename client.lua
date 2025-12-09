local isEditMode = false

RegisterCommand('UIEdit', function()
    isEditMode = not isEditMode
    SetNuiFocus(isEditMode, isEditMode)
    SendNUIMessage({ type = "toggleEdit", enable = isEditMode })
end)

RegisterNUICallback('closeEdit', function(data, cb)
    isEditMode = false
    SetNuiFocus(false, false)
    SendNUIMessage({ type = "toggleEdit", enable = false })
    cb('ok')
end)

RegisterNUICallback('saveSettings', function(data, cb)
    local jsonString = json.encode(data)
    SetResourceKvp('hud_settings', jsonString)
    cb('ok')
end)
-- NOVÝ CALLBACK PRO RESET
RegisterNUICallback('resetSettings', function(data, cb)
    DeleteResourceKvp('hud_settings') -- Smaže data z KVP
    cb('ok')
end)

local function GetNameOfZone(coords)
    local name = ""
    local zone = Citizen.InvokeNative(0x43AD8FC02B429D33, coords.x, coords.y, coords.z, 10)

    -- debugPrint(tostring(zone))
    for k, v in pairs(Config.States) do
        if zone == v then
            name = k
        end
    end

    return name
end

local function GetWeaponName(weaponHash)
    for name, hash in pairs(Config.WeaponHash) do
        if hash == weaponHash then
            return name
        end
    end
    return "Unknown"
end

CreateThread(function()
    Wait(1000)
    local savedSettings = GetResourceKvpString('hud_settings')
    if savedSettings then
        SendNUIMessage({ type = "loadSettings", settings = json.decode(savedSettings) })
    end
end)

CreateThread(function()
    while true do
        Wait(500)
        local stats = exports.aprts_metabolism:getMetabolism()
        -- print(json.encode(stats, { indent = true }))
        local ped = PlayerPedId()
        local playerPos = GetEntityCoords(ped)
        local zoneID = Citizen.InvokeNative(0x43AD8FC02B429D33, playerPos.x, playerPos.y, playerPos.z, 10)
            -- get zone name by ID
        local zoneName = GetNameOfZone(playerPos)
        -- 1. ZDRAVÍ (Health)
        local healthOuter = GetEntityHealth(ped) -- Aktuální HP
        -- Core Value (Index 0 = Health)
        local healthInner = Citizen.InvokeNative(0x36731AC041289BB1, ped, 0) 

        -- 2. STAMINA
        local stamina = GetAttributeCoreValue(PlayerPedId(), 1)
        local softStamina = math.floor(GetPedStamina(PlayerPedId()))

        -- 3. DEAD EYE (Volitelné, pokud bys chtěl)
        -- local deadEyeOuter = Citizen.InvokeNative(0xD53343AA4FB2200D, PlayerId())
        -- local deadEyeInner = Citizen.InvokeNative(0x36731AC041289BB1, ped, 2)

        -- 4. METABOLISMUS (Hunger/Thirst) - Zde doplň své exporty
        -- 5. další užitečnosti
        local weaponObj = GetPedWeaponObject(ped, true)
        local hasWapon, weaponHash = GetCurrentPedWeapon(ped, true)
        stats.time = GetGameTimer()
        stats.dayOdWeek = GetClockDayOfWeek()
        stats.hour = GetClockHours()
        stats.minute = GetClockMinutes()
        stats.time = string.format("%02d:%02d", stats.hour, stats.minute)
        stats.weaponHash = weaponHash
        stats.weaponName = GetWeaponName(weaponHash)
        stats.health_outer = healthOuter
        stats.health_inner = healthInner
        stats.stamina_outer = softStamina
        stats.stamina_inner = stamina
        stats.rain = math.floor(GetRainLevel() * 100)
        stats.snow = math.floor(GetSnowLevel() * 100)
        stats.wet = math.floor(GetPedWetness(PlayerPedId()) * 100)
        stats.temp = math.floor(GetTemperatureAtCoords(GetEntityCoords(ped)))
        stats.zone = zoneName
        stats.zone_id = zoneID
        print(json.encode(stats, { indent = true }))
        SendNUIMessage({
            type = "updateHUD",
            status = stats
        })
    end
end)