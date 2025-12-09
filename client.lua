local isEditMode = false

RegisterCommand('UIEdit', function()
    isEditMode = not isEditMode
    SetNuiFocus(isEditMode, isEditMode)
    SendNUIMessage({
        type = "toggleEdit",
        enable = isEditMode
    })
end)

RegisterNUICallback('closeEdit', function(data, cb)
    isEditMode = false
    SetNuiFocus(false, false)
    SendNUIMessage({
        type = "toggleEdit",
        enable = false
    })
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

-- Vrátí:
-- isHorse          -> jestli sedíš na koni
-- horseHealth      -> zdraví koně (int)
-- staminaInner     -> 0.0–1.0 (základní bar)
-- staminaOuter     -> 0.0–1.0 (gold bar / přesah)
-- isGoldStamina    -> jestli má kůň vůbec nějaký gold přesah

function GetHorseHealthAndStaminaBars(pedPlayer)
    local isHorse = false
    local horseHealth = 0
    local staminaInner = 0.0
    local staminaOuter = 0.0
    local isGoldStamina = false

    if not IsPedOnMount(pedPlayer) then
        return isHorse, horseHealth, staminaInner, staminaOuter, isGoldStamina
    end

    isHorse = true

    local horse = GetMount(pedPlayer)

    -- zdraví koně
    horseHealth = Citizen.InvokeNative(0x4700A416E8324EF3, horse, Citizen.ResultAsInteger())

    -- aktuální a max stamina
    local staminaCurrent = Citizen.InvokeNative(0x775A1CA7893AA8B5, horse, Citizen.ResultAsFloat())
    local staminaMax = Citizen.InvokeNative(0xCB42AFE2B613EE55, horse, Citizen.ResultAsFloat()) or 100.0

    if not staminaMax or staminaMax <= 0 then
        staminaMax = 100.0
    end

    if type(staminaCurrent) ~= "number" or type(staminaMax) ~= "number" then
        return isHorse, horseHealth, staminaInner, staminaOuter, isGoldStamina
    end

    -- raw poměr staminy (může být > 1.0, pokud má gold)
    local ratio = staminaCurrent / staminaMax

    -- inner bar = vždy 0–1
    staminaInner = math.max(0.0, math.min(ratio, 1.0))

    -- outer bar = jen pokud je stamina nad 100 %
    if ratio > 1.0 then
        isGoldStamina = true
        -- kolik je přesah nad 100 %, omezeno na 1.0
        staminaOuter = math.max(0.0, math.min(ratio - 1.0, 1.0))
    else
        staminaOuter = 0.0
        isGoldStamina = false
    end

    return isHorse, horseHealth, staminaInner, staminaOuter, isGoldStamina
end

CreateThread(function()
    Wait(1000)
    local savedSettings = GetResourceKvpString('hud_settings')
    if savedSettings then
        SendNUIMessage({
            type = "loadSettings",
            settings = json.decode(savedSettings)
        })
    end
end)
local stats = {}
CreateThread(function()
    while true do
        Wait(600)
        stats = exports.aprts_metabolism:getMetabolism()
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
        local success, bodyTemp = pcall(function()
            return exports.aprts_medicalAtention:getBodyTemperature()
        end)
        if success and bodyTemp then
            stats.body_temp = math.floor(bodyTemp)
        else
            stats.body_temp = 36 -- Defaultní hodnota, pokud export není dostupný
        end
        local weaponObj = GetPedWeaponObject(ped, true)
        local hasWapon, weaponHash = GetCurrentPedWeapon(ped, true)

        -- local onMount = IsPedOnMount(ped)
        -- if onMount then
        --     local mount = GetMount(ped)
        --     if DoesEntityExist(mount) then
        --         local mountHealth = GetEntityHealth(mount)
        --         stats.mount_healthOuter = mountHealth
        --         stats.mount_healthInner = Citizen.InvokeNative(0x36731AC041289BB1, mount, 0)

        --         stats.mount_staminaOuter = GetAttributeCoreValue(mount, 1)
        --         stats.mount_staminaInner = Citizen.InvokeNative(0x36731AC041289BB1, mount, 1)
        --     else
        --         stats.mount_healthOuter = 0
        --         stats.mount_healthInner = 0
        --         stats.mount_staminaOuter = 0
        --         stats.mount_staminaInner = 0

        --     end
        -- else
        --     stats.mount_healthOuter = 0
        --     stats.mount_healthInner = 0
        --     stats.mount_staminaOuter = 0
        --     stats.mount_staminaInner = 0
        -- end

        local isHorse, hp, stamInner, stamOuter, isGold = GetHorseHealthAndStaminaBars(PlayerPedId())

        if isHorse then
            stats.on_mount = true
            stats.mount_healthOuter = hp
            stats.mount_stamina_inner = math.floor(stamInner * 100)
            stats.mount_stamina_outer = math.floor(stamOuter * 100)
            stats.mount_isGoldStamina = isGold
        else
            stats.on_mount = false
            stats.mount_healthOuter = 0
            stats.mount_stamina_inner = 0.0
            stats.mount_stamina_outer = 0.0
            stats.mount_isGoldStamina = false
        end

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
        -- print(json.encode(stats, { indent = true }))
        SendNUIMessage({
            type = "updateHUD",
            status = stats
        })
    end
end)


RegisterCommand("printStats", function()
    print(json.encode(stats, { indent = true }))
end)