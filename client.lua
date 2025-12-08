local isEditMode = false

-- Příkaz pro otevření editoru
RegisterCommand('UIEdit', function()
    isEditMode = not isEditMode
    SetNuiFocus(isEditMode, isEditMode)
    SendNUIMessage({
        type = "toggleEdit",
        enable = isEditMode
    })
end)

-- Callback pro zavření editoru z tlačítka v HTML
RegisterNUICallback('closeEdit', function(data, cb)
    isEditMode = false
    SetNuiFocus(false, false)
    SendNUIMessage({
        type = "toggleEdit",
        enable = false
    })
    cb('ok')
end)

-- Callback pro uložení nastavení (KVP)
RegisterNUICallback('saveSettings', function(data, cb)
    -- Data přijdou jako JSON objekt. Můžeme je uložit do Resource KVP
    -- Převedeme tabulku na string pro uložení
    local jsonString = json.encode(data)
    SetResourceKvp('hud_settings', jsonString)
    cb('ok')
end)

-- Načtení nastavení při startu a poslání do NUI
CreateThread(function()
    Wait(1000) -- Počkat až se NUI načte
    local savedSettings = GetResourceKvpString('hud_settings')
    if savedSettings then
        SendNUIMessage({
            type = "loadSettings",
            settings = json.decode(savedSettings)
        })
    end
end)

-- Hlavní smyčka pro aktualizaci dat
CreateThread(function()
    while true do
        Wait(200) -- Aktualizace 5x za sekundu (optimalizace)

        local ped = PlayerPedId()
        local health = GetEntityHealth(ped)
        local maxHealth = GetEntityMaxHealth(ped, false)
        
        -- Přepočet HP na procenta (někdy je max hp 600, jindy 100)
        local hpPercent = (health / maxHealth) * 100
        
        -- Stamina (Core)
        local stamina = GetAttributeCoreValue(ped, 0) -- 0 je obvykle Health Core, 1 Stamina Core. Nutno ověřit natives pro RedM, liší se od FiveM.
        -- Alternativa pro Staminu v RDR3 natives:
        local staminaPercent = Citizen.InvokeNative(0x36731AC041289BB1, ped, 1) -- _GET_ATTRIBUTE_CORE_VALUE (1 = Stamina)

        -- !!! ZDE NAPOJ SVŮJ FRAMEWORK PRO JÍDLO/PITÍ !!!
        -- Příklad pro VORP:
        -- TriggerEvent("vorp:getCharacter", function(user)
        --     local hunger = user.hunger
        --     local thirst = user.thirst
        -- end)
        
        -- Pro demo účely dáváme random hodnoty pro jídlo/pití
        local hunger = 100 -- ZMĚNIT NA EXPORT
        local thirst = 100 -- ZMĚNIT NA EXPORT

        SendNUIMessage({
            type = "updateHUD",
            status = {
                health = hpPercent,
                stamina = staminaPercent,
                hunger = hunger,
                thirst = thirst
            }
        })
    end
end)