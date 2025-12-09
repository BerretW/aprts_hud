const defaultSettings = {
    health: { 
        label: "HP", icon: "fa-solid fa-heart", style: "circle", mode: "dual",
        srcOuter: "health_outer", srcInner: "health_inner",
        colorOuter: "#d93838", colorInner: "#ff8080", colorBg: "#4a1212", 
        min: 0, maxOuter: 600, maxInner: 100, 
        speed: 400, scale: 1.0, x: 2, y: 90, enabled: true 
    },
    stamina: { 
        label: "STA", icon: "fa-solid fa-bolt", style: "circle", mode: "dual",
        srcOuter: "stamina_outer", srcInner: "stamina_inner",
        colorOuter: "#d9a838", colorInner: "#ffe080", colorBg: "#4a3812", 
        min: 0, maxOuter: 100, maxInner: 100, 
        speed: 400, scale: 1.0, x: 10, y: 90, enabled: true 
    },
    hunger: { 
        label: "JÍDLO", icon: "fa-solid fa-drumstick-bite", style: "circle", mode: "single",
        srcOuter: "hunger", srcInner: null,
        colorOuter: "#38d960", colorInner: null, colorBg: "#124a1a", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 18, y: 88, enabled: true 
    },
    thirst: { 
        label: "PITÍ", icon: "fa-solid fa-droplet", style: "circle", mode: "single",
        srcOuter: "thirst", srcInner: null,
        colorOuter: "#388bd9", colorInner: null, colorBg: "#122b4a", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 22, y: 88, enabled: true 
    },
    stress: { 
        label: "STRES", icon: "fa-solid fa-brain", style: "circle", mode: "single",
        srcOuter: "stress", srcInner: null,
        colorOuter: "#a838d9", colorInner: null, colorBg: "#2b0a2b", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 26, y: 88, enabled: false 
    },
    temp: { 
        label: "TEPLOTA", icon: "fa-solid fa-temperature-high", style: "circle", mode: "single",
        srcOuter: "temp", srcInner: null,
        colorOuter: "#a838d9", colorInner: null, colorBg: "#2b0a2b", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 26, y: 88, enabled: false 
    },
    wind : {
        label: "VÍTR", icon: "fa-solid fa-wind", style: "text", mode: "single",
        srcOuter: "wind", srcInner: null,
        colorOuter: "#ffffff", colorInner: null, colorBg: "rgba(0,0,0,0.5)",
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 400, scale: 1.0, x: 80, y: 5, enabled: false
    }
};

let indicators = JSON.parse(JSON.stringify(defaultSettings));
let isEditMode = false;
let currentEditingKey = null;
let snapToGrid = false; // Nová proměnná pro Grid
const GRID_SIZE = 40;   // Velikost mřížky v px (musí sedět s CSS)

$(document).ready(function() {
    loadSettings();
    renderHud();
    
    $('#input-scale').on('input', function() { $('#scale-val').text($(this).val()); });
    $('#input-mode').on('change', function() { toggleModalFields($(this).val()); });

    window.addEventListener('message', function(event) {
        let data = event.data;
        if (data.type === "updateHUD") updateValues(data.status);
        else if (data.type === "toggleEdit") toggleEditMode(data.enable);
        else if (data.type === "loadSettings") {
            if (data.settings && Object.keys(data.settings).length > 0) {
                let loaded = data.settings;
                for (let k in loaded) {
                    if (indicators[k]) {
                        if (loaded[k].max && !loaded[k].maxOuter) {
                            loaded[k].maxOuter = loaded[k].max; loaded[k].maxInner = 100;
                        }
                        $.extend(true, indicators[k], loaded[k]);
                    }
                }
                renderHud();
            }
        }
    });
});

// --- RENDER SYSTEM ---
function renderHud() {
    $('#hud-container').empty();
    
    for (const [key, data] of Object.entries(indicators)) {
        if (!data.enabled && !isEditMode) continue;

        let el = $(`<div id="${key}" class="hud-element" style="left:${data.x}%; top:${data.y}%;"></div>`);
        el.css('transform', `scale(${data.scale})`);
        
        if (!data.enabled) el.css('opacity', '0.3');

        if (data.style === 'text') {
            let iconHtml = data.icon ? `<i class="${data.icon} hud-icon"></i>` : "";
            el.html(`
                <div class="style-text" style="color:${data.colorOuter}; background:${data.colorBg}">
                    ${iconHtml} <span class="text-label">${data.label}</span> <span class="text-value">0</span>
                </div>
            `);
        } else {
            let iconColor = data.colorOuter; 
            let iconHtml = data.icon ? `<i class="${data.icon} hud-icon" style="color: ${iconColor};"></i>` : "";
            
            let content = `<div class="style-circle"><div class="circle-content">${iconHtml}</div></div>`;
            el.html(content);
        }

        el.on('mousedown', function(e) {
            if (!isEditMode) return;
            dragElement(e, $(this), key);
        });

        $('#hud-container').append(el);
        if (data.style !== 'text') initDualCircle(key, data);
    }
}

function initDualCircle(key, data) {
    let container = $(`#${key} .style-circle`);
    let outerDiv = $('<div class="ring-outer"></div>').appendTo(container);

    outerDiv.circleProgress({
        value: 0, size: 70, startAngle: -Math.PI / 2, thickness: 6, lineCap: 'round',
        fill: { color: data.colorOuter }, emptyFill: data.colorBg, animation: { duration: parseInt(data.speed) || 400 }
    });

    if (data.mode === 'dual') {
        let innerDiv = $('<div class="ring-inner"></div>').appendTo(container);
        innerDiv.circleProgress({
            value: 0, size: 70, startAngle: -Math.PI / 2, thickness: 8, lineCap: 'round',
            fill: { color: data.colorInner || "#ffffff" }, emptyFill: "rgba(0,0,0,0)", animation: { duration: parseInt(data.speed) || 400 }
        });
    }
}

// --- UPDATE HODNOT ---
function updateValues(statusData) {
    for (const [key, data] of Object.entries(indicators)) {
        if (!data.enabled) continue;

        let valOuter = statusData[data.srcOuter] || 0;
        let valInner = (data.mode === 'dual') ? (statusData[data.srcInner] || 0) : 0;
        let maxO = data.maxOuter || 100;
        let maxI = data.maxInner || 100;
        let min = data.min || 0;

        if (data.style === 'text') {
            let el = $(`#${key}`);
            let displayVal = Math.round(valOuter);
            if(data.mode === 'dual') displayVal = `${Math.round(valOuter)} / ${Math.round(valInner)}`;
            el.find('.text-value').text(displayVal);
            continue;
        }

        let pctOuter = Math.min(Math.max((valOuter - min) / (maxO - min), 0), 1);
        let pctInner = Math.min(Math.max((valInner - min) / (maxI - min), 0), 1);
        let el = $(`#${key}`);

        let outerEl = el.find('.ring-outer');
        if (outerEl.data('circle-progress')) outerEl.circleProgress('value', pctOuter);

        if (data.mode === 'dual') {
            let innerEl = el.find('.ring-inner');
            if (innerEl.data('circle-progress')) innerEl.circleProgress('value', pctInner);
        }
    }
}

// --- GRID SYSTEM ---
function toggleGrid(checked) {
    snapToGrid = checked;
    if (checked) {
        $('#grid-layer').removeClass('hidden');
    } else {
        $('#grid-layer').addClass('hidden');
    }
}

// --- EDIT MODE LOGIC ---
function toggleEditMode(enable) {
    isEditMode = enable;
    if (enable) {
        $('#edit-overlay').fadeIn();
        $('.hud-element').addClass('editable');
        renderHud();
    } else {
        $('#edit-overlay').fadeOut();
        $('.hud-element').removeClass('editable');
        // Vypnout grid při zavření
        $('#chk-grid').prop('checked', false);
        toggleGrid(false);
        saveSettings();
        renderHud();
    }
}

function dragElement(e, el, key) {
    let startX = e.clientX, startY = e.clientY;
    let startLeft = el.position().left, startTop = el.position().top;
    let hasMoved = false;

    $(document).on('mousemove.drag', function(evt) {
        let dx = evt.clientX - startX;
        let dy = evt.clientY - startY;
        
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // --- GRID SNAPPING LOGIC ---
        if (snapToGrid) {
            newLeft = Math.round(newLeft / GRID_SIZE) * GRID_SIZE;
            newTop = Math.round(newTop / GRID_SIZE) * GRID_SIZE;
        }

        el.css({ top: newTop, left: newLeft });
    });

    $(document).on('mouseup.drag', function() {
        $(document).off('.drag');
        if (!hasMoved) openModal(key);
        else {
            indicators[key].x = (el.position().left / $(window).width()) * 100;
            indicators[key].y = (el.position().top / $(window).height()) * 100;
        }
    });
}

// --- MODAL & SETTINGS ---
function openModal(key) {
    currentEditingKey = key;
    let data = indicators[key];

    $('#input-style').val(data.style || 'circle');
    $('#input-mode').val(data.mode);
    $('#input-icon').val(data.icon);
    $('#input-src-outer').val(data.srcOuter);
    $('#input-src-inner').val(data.srcInner);
    $('#input-max-outer').val(data.maxOuter || 100);
    $('#input-max-inner').val(data.maxInner || 100);
    $('#input-min').val(data.min);
    $('#input-color-outer').val(data.colorOuter);
    $('#input-color-inner').val(data.colorInner || "#ffffff");
    $('#input-color-bg').val(data.colorBg.startsWith('#') ? data.colorBg : "#000000");
    $('#input-scale').val(data.scale);
    $('#scale-val').text(data.scale);
    $('#input-enabled').prop('checked', data.enabled);
    
    toggleModalFields(data.mode);
    $('#settings-modal').removeClass('hidden');
}

function toggleModalFields(mode) {
    if (mode === 'single') {
        $('.dual-only').hide();
    } else {
        $('.dual-only').show();
        $('.dual-only').css('display', 'block'); 
        $('.form-row .dual-only').css('display', 'block'); 
    }
}

function saveModal() {
    if (!currentEditingKey) return;
    let k = currentEditingKey;

    indicators[k].style = $('#input-style').val();
    indicators[k].mode = $('#input-mode').val();
    indicators[k].srcOuter = $('#input-src-outer').val();
    indicators[k].srcInner = $('#input-src-inner').val();
    indicators[k].maxOuter = parseFloat($('#input-max-outer').val()) || 100;
    indicators[k].maxInner = parseFloat($('#input-max-inner').val()) || 100;
    indicators[k].min = parseFloat($('#input-min').val()) || 0;
    indicators[k].colorOuter = $('#input-color-outer').val();
    indicators[k].colorInner = $('#input-color-inner').val();
    indicators[k].colorBg = $('#input-color-bg').val();
    indicators[k].icon = $('#input-icon').val();
    indicators[k].scale = parseFloat($('#input-scale').val());
    indicators[k].enabled = $('#input-enabled').is(':checked');
    
    renderHud(); 
    closeModal();
}

function closeModal() {
    $('#settings-modal').addClass('hidden');
    currentEditingKey = null;
}

// --- IMPORT / EXPORT & RESET ---
function openIOModal(mode) {
    $('#io-modal').removeClass('hidden');
    let textarea = $('#io-textarea');
    if (mode === 'export') {
        $('#io-title').text("EXPORT NASTAVENÍ");
        $('#btn-copy').show(); $('#btn-import').hide();
        textarea.val(JSON.stringify(indicators, null, 2)); textarea.prop('readonly', true);
    } else {
        $('#io-title').text("IMPORT NASTAVENÍ");
        $('#btn-copy').hide(); $('#btn-import').show();
        textarea.val(""); textarea.attr('placeholder', 'Sem vlož JSON kód...'); textarea.prop('readonly', false);
    }
}
function closeIOModal() { $('#io-modal').addClass('hidden'); }
function exportConfig() { openIOModal('export'); }
function importConfig() { openIOModal('import'); }
// Přidej tuto funkci kamkoliv do souboru (např. před applyImport)
function showNotification(message, isError = false) {
    let el = $('#custom-notification');
    let icon = $('#notif-icon');
    
    $('#notif-text').text(message);
    
    if (isError) {
        el.addClass('error');
        icon.attr('class', 'fa-solid fa-circle-exclamation');
    } else {
        el.removeClass('error');
        icon.attr('class', 'fa-solid fa-circle-check');
    }
    
    el.removeClass('hidden');

    // Automaticky schovat po 3 sekundách
    setTimeout(() => {
        el.addClass('hidden');
    }, 3000);
}

// ... (renderHud, initDualCircle, updateValues, openModal... beze změny) ...

// UPRAVENÁ FUNKCE IMPORTU
function applyImport() {
    let rawJson = $('#io-textarea').val();
    try {
        let parsed = JSON.parse(rawJson);
        
        // Jednoduchá validace
        if (!parsed.health && !parsed.stamina) {
            throw new Error("Kód neobsahuje platná data HUDu.");
        }

        // Reset na default a přepis daty
        indicators = JSON.parse(JSON.stringify(defaultSettings));
        $.extend(true, indicators, parsed);
        
        renderHud();
        saveSettings();
        
        // Zavřít Import okno
        closeIOModal();
        
        // Zobrazit naši novou notifikaci MÍSTO alert()
        showNotification("Nastavení úspěšně nahráno!");
        
    } catch (e) {
        // Zobrazit chybovou notifikaci
        showNotification("Chyba importu: " + e.message, true);
    }
}

// ... (zbytek souboru: copyToClipboard, resetSettings atd.) ...

// UPRAVENÁ FUNKCE KOPÍROVÁNÍ (volitelně můžeš taky použít notifikaci)
function copyToClipboard() {
    let textarea = document.getElementById("io-textarea");
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(textarea.value).then(() => {
        let btn = $('#btn-copy');
        let origText = btn.text();
        btn.text("ZKOPÍROVÁNO!");
        btn.css('background', '#38d960');
        
        // Můžeme použít i notifikaci:
        // showNotification("Kód zkopírován do schránky");
        
        setTimeout(() => {
            btn.text(origText);
            btn.css('background', '');
        }, 2000);
    });
}

function resetSettings() {
    indicators = JSON.parse(JSON.stringify(defaultSettings));
    localStorage.removeItem('redm_hud_v7');
    $.post('https://' + GetParentResourceName() + '/resetSettings', JSON.stringify({}));
    renderHud();
}

function closeEditMode() { saveSettings(); $.post('https://' + GetParentResourceName() + '/closeEdit', JSON.stringify({})); }
function saveSettings() { localStorage.setItem('redm_hud_v7', JSON.stringify(indicators)); $.post('https://' + GetParentResourceName() + '/saveSettings', JSON.stringify(indicators)); }
function loadSettings() { let saved = localStorage.getItem('redm_hud_v7'); if (saved) { let parsed = JSON.parse(saved); $.extend(true, indicators, defaultSettings, parsed); } }