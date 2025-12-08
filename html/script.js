// CONFIG UPDATE: Přidáno maxOuter a maxInner
const defaultSettings = {
    health: { 
        label: "HP", icon: "fa-solid fa-heart", mode: "dual",
        srcOuter: "health_outer", srcInner: "health_inner",
        colorOuter: "#d93838", colorInner: "#ff8080", colorBg: "#4a1212", 
        min: 0, maxOuter: 600, maxInner: 100, // Zde je změna
        speed: 400, scale: 1.0, x: 2, y: 90, enabled: true 
    },
    stamina: { 
        label: "STA", icon: "fa-solid fa-bolt", mode: "dual",
        srcOuter: "stamina_outer", srcInner: "stamina_inner",
        colorOuter: "#d9a838", colorInner: "#ffe080", colorBg: "#4a3812", 
        min: 0, maxOuter: 134, maxInner: 100, // Stamina outer bývá 100, ale může být víc
        speed: 400, scale: 1.0, x: 10, y: 90, enabled: true 
    },
    hunger: { 
        label: "JÍDLO", icon: "fa-solid fa-drumstick-bite", mode: "single",
        srcOuter: "hunger", srcInner: null,
        colorOuter: "#38d960", colorInner: null, colorBg: "#124a1a", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 18, y: 88, enabled: true 
    },
    thirst: { 
        label: "PITÍ", icon: "fa-solid fa-droplet", mode: "single",
        srcOuter: "thirst", srcInner: null,
        colorOuter: "#388bd9", colorInner: null, colorBg: "#122b4a", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 22, y: 88, enabled: true 
    },
    stress: { 
        label: "PITÍ", icon: "fa-solid fa-droplet", mode: "single",
        srcOuter: "thirst", srcInner: null,
        colorOuter: "#388bd9", colorInner: null, colorBg: "#122b4a", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 22, y: 88, enabled: true 
    }
};

let indicators = JSON.parse(JSON.stringify(defaultSettings));
let isEditMode = false;
let currentEditingKey = null;

$(document).ready(function() {
    loadSettings();
    renderHud();
    $('#input-scale').on('input', function() { $('#scale-val').text($(this).val()); });

    window.addEventListener('message', function(event) {
        let data = event.data;
        if (data.type === "updateHUD") updateValues(data.status);
        else if (data.type === "toggleEdit") toggleEditMode(data.enable);
        else if (data.type === "loadSettings") {
            if (data.settings && Object.keys(data.settings).length > 0) {
                // Sloučení a zachování struktury
                let loaded = data.settings;
                for (let k in loaded) {
                    if (indicators[k]) {
                        // Fix pro staré uložené verze, které neměly maxOuter/Inner
                        if (loaded[k].max && !loaded[k].maxOuter) {
                            loaded[k].maxOuter = loaded[k].max;
                            loaded[k].maxInner = 100;
                        }
                        $.extend(true, indicators[k], loaded[k]);
                    }
                }
                renderHud();
            }
        }
    });
});

function renderHud() {
    $('#hud-container').empty();
    
    for (const [key, data] of Object.entries(indicators)) {
        if (!data.enabled && !isEditMode) continue;

        let el = $(`<div id="${key}" class="hud-element" style="left:${data.x}%; top:${data.y}%;"></div>`);
        el.css('transform', `scale(${data.scale})`);
        if (!data.enabled) el.css('opacity', '0.3');

        // ZMĚNA ZDE: Přidán style="color: ..." do ikony
        let iconColor = data.colorOuter; // Barva ikony podle vnějšího kruhu
        let iconHtml = data.icon ? `<i class="${data.icon} hud-icon" style="color: ${iconColor};"></i>` : "";
        
        let content = `<div class="style-circle">
                          <div class="circle-content">${iconHtml}</div>
                       </div>`;
        el.html(content);

        el.on('mousedown', function(e) {
            if (!isEditMode) return;
            dragElement(e, $(this), key);
        });

        $('#hud-container').append(el);
        initDualCircle(key, data);
    }
}

function initDualCircle(key, data) {
    let container = $(`#${key} .style-circle`);
    
    // 1. OUTER RING
    // Vytvoříme div s třídou ring-outer (styly řeší CSS)
    let outerDiv = $('<div class="ring-outer"></div>').appendTo(container);

    outerDiv.circleProgress({
        value: 0,
        size: 70,
        startAngle: -Math.PI / 2,
        thickness: 6,
        lineCap: 'round',
        fill: { color: data.colorOuter },
        emptyFill: data.colorBg, // Pozadí baru
        animation: { duration: parseInt(data.speed) }
    });

    // 2. INNER RING (Pouze v módu dual)
    if (data.mode === 'dual') {
        // Vytvoříme div s třídou ring-inner (styly řeší CSS včetně scale)
        let innerDiv = $('<div class="ring-inner"></div>').appendTo(container);

        innerDiv.circleProgress({
            value: 0,
            size: 70, // Velikost canvasu stejná, zmenší se přes CSS transform
            startAngle: -Math.PI / 2,
            thickness: 8, // Opticky tlustší, protože se celý kruh zmenší
            lineCap: 'round',
            fill: { color: data.colorInner || "#ffffff" },
            emptyFill: "rgba(0,0,0,0)", // Průhledné pozadí, abychom viděli skrz na outer
            animation: { duration: parseInt(data.speed) }
        });
    }
}

function updateValues(statusData) {
    for (const [key, data] of Object.entries(indicators)) {
        if (!data.enabled) continue;

        let valOuter = statusData[data.srcOuter] || 0;
        let valInner = (data.mode === 'dual') ? (statusData[data.srcInner] || 0) : 0;

        // VÝPOČET PROCENT S ROZDÍLNÝM MAX
        // Použijeme data.maxOuter a data.maxInner. Pokud neexistují (starý save), fallback na 100.
        let maxO = data.maxOuter || 100;
        let maxI = data.maxInner || 100;
        let min = data.min || 0;

        let pctOuter = (valOuter - min) / (maxO - min);
        let pctInner = (valInner - min) / (maxI - min);

        // Clamp 0-1 (aby to nepřeteklo grafiku)
        pctOuter = Math.min(Math.max(pctOuter, 0), 1);
        pctInner = Math.min(Math.max(pctInner, 0), 1);

        let el = $(`#${key}`);

        let outerEl = el.find('.ring-outer');
        if (outerEl.data('circle-progress')) {
            outerEl.circleProgress('value', pctOuter);
        }

        if (data.mode === 'dual') {
            let innerEl = el.find('.ring-inner');
            if (innerEl.data('circle-progress')) {
                innerEl.circleProgress('value', pctInner);
            }
        }
    }
}

// --- MODAL LOGIKA ---
function openModal(key) {
    currentEditingKey = key;
    let data = indicators[key];

    $('#input-mode').val(data.mode);
    $('#input-icon').val(data.icon);
    
    $('#input-src-outer').val(data.srcOuter);
    $('#input-src-inner').val(data.srcInner);

    // Načtení Max hodnot
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
        $('.dual-only').show(); // Používáme flex pro zachování layoutu, nebo show
        $('.dual-only').css('display', 'block'); // Pro jistotu u inputů
        // U row elementů to chceme vrátit do flexu, pokud jsou ve form-row
        $('.form-row .dual-only').css('display', 'block'); 
    }
}

function saveModal() {
    if (!currentEditingKey) return;
    let k = currentEditingKey;

    indicators[k].mode = $('#input-mode').val();
    indicators[k].srcOuter = $('#input-src-outer').val();
    indicators[k].srcInner = $('#input-src-inner').val();

    // Uložení Max hodnot
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

// Zbytek beze změny...
$(document).on('change', '#input-mode', function() { toggleModalFields($(this).val()); });
function toggleEditMode(enable) { isEditMode = enable; if (enable) { $('#edit-overlay').fadeIn(); $('.hud-element').addClass('editable'); renderHud(); } else { $('#edit-overlay').fadeOut(); $('.hud-element').removeClass('editable'); saveSettings(); renderHud(); } }
function closeEditMode() { saveSettings(); $.post('https://' + GetParentResourceName() + '/closeEdit', JSON.stringify({})); }
function closeModal() { $('#settings-modal').addClass('hidden'); currentEditingKey = null; }
function saveSettings() { localStorage.setItem('redm_hud_v7', JSON.stringify(indicators)); $.post('https://' + GetParentResourceName() + '/saveSettings', JSON.stringify(indicators)); }
function loadSettings() { let saved = localStorage.getItem('redm_hud_v7'); if (saved) { let parsed = JSON.parse(saved); $.extend(true, indicators, defaultSettings, parsed); } }
function dragElement(e, el, key) {
    let startX = e.clientX, startY = e.clientY, startLeft = el.position().left, startTop = el.position().top, hasMoved = false;
    $(document).on('mousemove.drag', function(evt) {
        if (Math.abs(evt.clientX - startX) > 2 || Math.abs(evt.clientY - startY) > 2) hasMoved = true;
        el.css({ top: startTop + (evt.clientY - startY), left: startLeft + (evt.clientX - startX) });
    });
    $(document).on('mouseup.drag', function() {
        $(document).off('.drag');
        if (!hasMoved) openModal(key);
        else { indicators[key].x = (el.position().left / $(window).width()) * 100; indicators[key].y = (el.position().top / $(window).height()) * 100; }
    });
}