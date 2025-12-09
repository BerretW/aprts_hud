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


CreateThread(function()
    Wait(1000)
    local savedSettings = GetResourceKvpString('hud_settings')
    if savedSettings then
        SendNUIMessage({ type = "loadSettings", settings = json.decode(savedSettings) })
    end
end)

CreateThread(function()
    while true do
        Wait(200)
        local stats = exports.aprts_metabolism:getMetabolism()
        -- print(json.encode(stats, { indent = true }))
        local ped = PlayerPedId()
        
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

        stats.health_outer = healthOuter
        stats.health_inner = healthInner
        stats.stamina_outer = softStamina
        stats.stamina_inner = stamina
        stats.temp = math.floor(GetTemperatureAtCoords(GetEntityCoords(ped)))
        SendNUIMessage({
            type = "updateHUD",
            status = stats
        })
    end
end)