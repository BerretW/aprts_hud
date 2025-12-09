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
        label: "JÍDLO", icon: "fa-solid fa-drumstick-bite", style: "bar", mode: "single",
        srcOuter: "hunger", srcInner: null,
        colorOuter: "#38d960", colorInner: null, colorBg: "rgba(0,0,0,0.6)", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 18, y: 88, enabled: true 
    },
    thirst: { 
        label: "PITÍ", icon: "fa-solid fa-droplet", style: "bar", mode: "single",
        srcOuter: "thirst", srcInner: null,
        colorOuter: "#388bd9", colorInner: null, colorBg: "rgba(0,0,0,0.6)", 
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 800, scale: 1.0, x: 18, y: 93, enabled: true 
    },
    // Ukázka výchozího nastavení pro NUTRI
    nutrition: {
        label: "AVG", icon: "", style: "nutri", mode: "single",
        srcOuter: null, srcInner: null,
        // Defaultní sloty, uživatel si je musí napojit na správná data z exportu
        slots: ["protein", "fats", "carbs", "vitamins"], 
        colorOuter: "#ffffff", colorInner: null, colorBg: "rgba(0,0,0,0.55)",
        min: 0, maxOuter: 100, maxInner: 100,
        speed: 400, scale: 1.0, x: 45, y: 85, enabled: false
    }
};

let indicators = JSON.parse(JSON.stringify(defaultSettings));
let isEditMode = false;
let currentEditingKey = null;
let snapToGrid = false;
const GRID_SIZE = 40;
let availableVariables = new Set(); 

// Definice barev pro NUTRI styl (podle požadavku)
const NUTRI_COLORS = ['#7b8a9a', '#c9a36a', '#7fa075', '#a17bb5'];

$(document).ready(function() {
    loadSettings();
    renderHud();
    
    $('#input-scale').on('input', function() { $('#scale-val').text($(this).val()); });
    $('#input-mode').on('change', function() { toggleModalFields($(this).val()); });
    $('#input-style').on('change', function() { toggleModalStyleFields($(this).val()); });

    window.addEventListener('message', function(event) {
        let data = event.data;
        if (data.type === "updateHUD") {
            if (data.status) {
                Object.keys(data.status).forEach(key => availableVariables.add(key));
                updateValues(data.status);
            }
        }
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
    makeDraggable(document.getElementById("edit-window"));
});

// --- RENDER SYSTEM ---
function renderHud() {
    $('#hud-container').empty();
    
    for (const [key, data] of Object.entries(indicators)) {
        if (!data.enabled && !isEditMode) continue;

        let el = $(`<div id="${key}" class="hud-element" style="left:${data.x}%; top:${data.y}%;"></div>`);
        el.css('transform', `scale(${data.scale})`);
        
        if (!data.enabled) el.css('opacity', '0.3');

        // --- NUTRI STYLE (MULTI-RING SVG) ---
        if (data.style === 'nutri') {
            // Generování SVG
            const size = 130;
            const stroke = 6;
            const gap = 3;
            const startAngle = -225;
            const sweep = 270;
            const center = size / 2;
            const maxR = center - stroke / 2;
            const endAngle = startAngle + sweep;

            let pathsHtml = "";
            let fillsHtml = "";
            let innerBgR = 0;

            // Generujeme 4 kruhy (pro 4 sloty)
            for (let i = 0; i < 4; i++) {
                const radius = maxR - i * (stroke + gap);
                if (i === 3) innerBgR = radius - stroke; // Vnitřní pozadí pro text

                // Vypočítáme SVG cestu (Arc)
                const d = describeArc(center, center, radius, startAngle, endAngle);
                
                // Track (šedé pozadí)
                pathsHtml += `<path d="${d}" class="nutri-track" stroke-width="${stroke}" />`;
                
                // Fill (barevný popředí)
                // Barva se bere z konstanty NUTRI_COLORS nebo fallback
                const color = NUTRI_COLORS[i] || "#ffffff";
                
                // ID pro update: {key}_fill_{i}
                fillsHtml += `<path id="${key}_fill_${i}" d="${d}" class="nutri-fill" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="0 0" stroke-dashoffset="0" />`;
            }

            el.html(`
                <div class="style-nutri">
                    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="nutri-circle-svg">
                        <g class="tracks">${pathsHtml}</g>
                        <g class="fills">${fillsHtml}</g>
                        <circle cx="${center}" cy="${center}" r="${Math.max(0, innerBgR)}" fill="${data.colorBg}" />
                    </svg>
                    <div class="nutri-center">
                        <div class="nutri-val" id="${key}_val">0</div>
                        <div class="nutri-lbl">${data.label || 'AVG'}</div>
                    </div>
                </div>
            `);
        }
        // --- GAUGE STYLE (Rafička) ---
        else if (data.style === 'gauge') {
            let iconHtml = data.icon ? `<i class="${data.icon} gauge-icon" style="color:${data.colorOuter}"></i>` : "";
            el.html(`
                <div class="style-gauge">
                    <div class="gauge-bg" style="background:${data.colorBg}"></div>
                    <div class="gauge-arc" style="border-color:${data.colorOuter}"></div>
                    <div class="gauge-needle"></div>
                    <div class="gauge-cover">${iconHtml}</div>
                    <div class="gauge-label">${data.label}</div>
                    <div class="gauge-value">0</div>
                </div>
            `);
        }
        // --- STACK STYLE (Multi-Value) ---
        else if (data.style === 'stack') {
            let rowsHtml = '';
            let slots = data.slots || [];
            slots.forEach((variable, index) => {
                if(variable && variable !== "") {
                    rowsHtml += `
                        <div class="stack-row" data-var="${variable}">
                            <span class="stack-name">${variable.substring(0,3).toUpperCase()}</span>
                            <div class="stack-track">
                                <div class="stack-fill" style="background:${data.colorOuter}; width:0%"></div>
                            </div>
                            <span class="stack-val">0</span>
                        </div>
                    `;
                }
            });

            let iconHtml = data.icon ? `<div class="stack-header-icon"><i class="${data.icon}"></i></div>` : "";
            el.html(`
                <div class="style-stack" style="background:${data.colorBg}">
                    <div class="stack-header">${iconHtml} <span>${data.label}</span></div>
                    <div class="stack-body">${rowsHtml}</div>
                </div>
            `);
        }
        // --- BAR STYLE ---
        else if (data.style === 'bar') {
            let iconHtml = data.icon ? `<div class="bar-icon"><i class="${data.icon}" style="color:${data.colorOuter}"></i></div>` : "";
            el.html(`
                <div class="style-bar" style="background:${data.colorBg}">
                    ${iconHtml}
                    <div class="bar-info">
                        <span class="bar-label">${data.label}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="background:${data.colorOuter}; width: 0%;"></div>
                        </div>
                    </div>
                    <span class="bar-value">0</span>
                </div>
            `);
        } 
        // --- TEXT STYLE ---
        else if (data.style === 'text') {
            let iconHtml = data.icon ? `<i class="${data.icon} hud-icon"></i>` : "";
            el.html(`
                <div class="style-text" style="color:${data.colorOuter}; background:${data.colorBg}">
                    ${iconHtml} <span class="text-label">${data.label}</span> <span class="text-value">0</span>
                </div>
            `);
        } 
        // --- CIRCLE STYLE ---
        else {
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
        if (data.style === 'circle') initDualCircle(key, data);
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

        let el = $(`#${key}`);
        let min = data.min || 0;
        let maxO = data.maxOuter || 100;

        const getNumericValue = (rawVal, maxLimit) => {
            if (typeof rawVal === 'number') return rawVal;
            if (typeof rawVal === 'boolean') return rawVal ? maxLimit : 0;
            return 0;
        };

        // --- NUTRI STYLE ---
        if (data.style === 'nutri') {
            let slots = data.slots || [];
            let total = 0;
            let count = 0;

            for(let i=0; i<4; i++) {
                let varName = slots[i];
                let val = 0;
                
                if (varName && statusData[varName] !== undefined) {
                    val = getNumericValue(statusData[varName], maxO);
                    total += val;
                    count++;
                }

                // Výpočet procenta pro tento kruh
                let pct = Math.min(Math.max((val - min) / (maxO - min), 0), 1);
                
                // SVG Path Math
                let pathEl = document.getElementById(`${key}_fill_${i}`);
                if (pathEl) {
                    let length = pathEl.getTotalLength();
                    // offset = length - (percentage * length)
                    let offset = length - (pct * length);
                    pathEl.style.strokeDasharray = `${length} ${length}`;
                    pathEl.style.strokeDashoffset = offset;
                }
            }

            // Výpočet průměru (AVG)
            let avg = count > 0 ? Math.round(total / count) : 0;
            
            if (data.showValue !== false) {
                el.find('.nutri-val').text(avg);
                el.find('.nutri-center').show();
            } else {
                el.find('.nutri-center').hide();
            }
            continue;
        }

        // --- STACK STYLE ---
        let valueFields = el.find('.text-value, .bar-value, .gauge-value, .stack-val');
        if (data.showValue === false) valueFields.hide(); else valueFields.show();

        if (data.style === 'stack') {
            el.find('.stack-row').each(function() {
                let varName = $(this).data('var');
                let rawVal = statusData[varName];
                let numVal = getNumericValue(rawVal, maxO);
                let pct = Math.min(Math.max((numVal - min) / (maxO - min), 0), 1);
                $(this).find('.stack-fill').css('width', (pct * 100) + '%');
                let textVal = Math.round(numVal);
                if (typeof rawVal === 'boolean') textVal = rawVal ? "ON" : "OFF";
                $(this).find('.stack-val').text(textVal);
            });
            continue;
        }

        // --- SINGLE / DUAL / GAUGE / TEXT ---
        let valOuter = statusData[data.srcOuter];

        if (data.style === 'text') {
            let displayVal;
            if (typeof valOuter === 'boolean') displayVal = valOuter ? "ON" : "OFF";
            else if (typeof valOuter === 'number') {
                displayVal = Math.round(valOuter);
                if(data.mode === 'dual') {
                    let valInner = statusData[data.srcInner];
                    if (typeof valInner === 'number') displayVal = `${displayVal} / ${Math.round(valInner)}`;
                    else if (typeof valInner === 'boolean') displayVal = `${displayVal} / ${valInner ? "ON" : "OFF"}`;
                }
            } else displayVal = (valOuter !== undefined && valOuter !== null) ? valOuter : "";
            el.find('.text-value').text(displayVal);
            continue;
        }

        let numValOuter = getNumericValue(valOuter, maxO);
        let pctOuter = Math.min(Math.max((numValOuter - min) / (maxO - min), 0), 1);

        if (data.style === 'gauge') {
            let deg = (pctOuter * 180) - 90; 
            el.find('.gauge-needle').css('transform', `translateX(-50%) rotate(${deg}deg)`);
            let textDisplay = (typeof valOuter === 'boolean') ? (valOuter ? "ON" : "OFF") : Math.round(numValOuter);
            el.find('.gauge-value').text(textDisplay);
            continue;
        }

        if (data.style === 'bar') {
            el.find('.bar-fill').css('width', (pctOuter * 100) + '%');
            let textDisplay = (typeof valOuter === 'boolean') ? (valOuter ? "ON" : "OFF") : Math.round(numValOuter);
            el.find('.bar-value').text(textDisplay);
            continue;
        }

        let outerEl = el.find('.ring-outer');
        if (outerEl.data('circle-progress')) outerEl.circleProgress('value', pctOuter);

        if (data.mode === 'dual') {
            let valInner = statusData[data.srcInner];
            let maxI = data.maxInner || 100;
            let numValInner = getNumericValue(valInner, maxI);
            let pctInner = Math.min(Math.max((numValInner - min) / (maxI - min), 0), 1);
            let innerEl = el.find('.ring-inner');
            if (innerEl.data('circle-progress')) innerEl.circleProgress('value', pctInner);
        }
    }
}

// --- MODAL FUNKCE ---
function populateVariableSelects(selectedOuter, selectedInner, slots) {
    let opts = '<option value="">-- Vyber --</option>';
    Array.from(availableVariables).sort().forEach(v => {
        opts += `<option value="${v}">${v}</option>`;
    });

    $('#input-src-outer').html(opts).val(selectedOuter);
    $('#input-src-inner').html(opts).val(selectedInner);

    $('.stack-selector').html(opts);
    if(slots && Array.isArray(slots)) {
        for(let i=0; i<5; i++) {
            $(`#stack-${i+1}`).val(slots[i] || "");
        }
    } else {
        $('.stack-selector').val("");
    }
}

function openModal(key) {
    currentEditingKey = key;
    let data = indicators[key];

    $('#input-label').val(data.label || key.toUpperCase());
    $('#input-style').val(data.style || 'circle');
    $('#input-mode').val(data.mode);
    $('#input-icon').val(data.icon);
    
    populateVariableSelects(data.srcOuter, data.srcInner, data.slots);

    $('#input-max-outer').val(data.maxOuter || 100);
    $('#input-max-inner').val(data.maxInner || 100);
    $('#input-min').val(data.min);
    $('#input-color-outer').val(data.colorOuter);
    $('#input-color-inner').val(data.colorInner || "#ffffff");
    $('#input-color-bg').val(data.colorBg.startsWith('#') || data.colorBg.startsWith('rgb') ? rgb2hex(data.colorBg) : "#000000");
    $('#input-scale').val(data.scale);
    $('#scale-val').text(data.scale);
    $('#input-show-value').prop('checked', data.showValue !== false);
    $('#input-enabled').prop('checked', data.enabled);
    
    toggleModalFields(data.mode);
    toggleModalStyleFields(data.style);
    $('#settings-modal').removeClass('hidden');
}

function toggleModalStyleFields(style) {
    // Pro styly, které vyžadují více slotů (Stack nebo Nutri)
    if (style === 'stack' || style === 'nutri') {
        $('.standard-inputs').hide();
        $('#stack-inputs').removeClass('hidden');
        $('#input-mode').val('single').prop('disabled', true);
    } else {
        $('.standard-inputs').show();
        $('#stack-inputs').addClass('hidden');
        
        if (style === 'bar' || style === 'gauge') {
            $('#input-mode').val('single').trigger('change');
            $('#input-mode').prop('disabled', true);
        } else {
            $('#input-mode').prop('disabled', false);
        }
    }
}

function saveModal() {
    if (!currentEditingKey) return;
    let k = currentEditingKey;

    indicators[k].label = $('#input-label').val();
    indicators[k].style = $('#input-style').val();
    indicators[k].mode = $('#input-mode').val();
    
    indicators[k].srcOuter = $('#input-src-outer').val();
    indicators[k].srcInner = $('#input-src-inner').val();

    if (indicators[k].style === 'stack' || indicators[k].style === 'nutri') {
        let newSlots = [];
        for(let i=1; i<=5; i++) {
            let val = $(`#stack-${i}`).val();
            if(val) newSlots.push(val);
        }
        indicators[k].slots = newSlots;
    }

    indicators[k].maxOuter = parseFloat($('#input-max-outer').val()) || 100;
    indicators[k].maxInner = parseFloat($('#input-max-inner').val()) || 100;
    indicators[k].min = parseFloat($('#input-min').val()) || 0;
    indicators[k].colorOuter = $('#input-color-outer').val();
    indicators[k].colorInner = $('#input-color-inner').val();
    indicators[k].colorBg = $('#input-color-bg').val();
    indicators[k].icon = $('#input-icon').val();
    indicators[k].scale = parseFloat($('#input-scale').val());
    indicators[k].showValue = $('#input-show-value').is(':checked');
    indicators[k].enabled = $('#input-enabled').is(':checked');
    
    renderHud(); 
    closeModal();
    showNotification("Změny aplikovány");
}

function rgb2hex(orig){ if(!orig) return "#000000"; if(orig.startsWith('#')) return orig; let rgb = orig.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i); return (rgb && rgb.length === 4) ? "#" + ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) + ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) + ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : orig; }
function toggleModalFields(mode) { if (mode === 'single') { $('.dual-only').hide(); } else { $('.dual-only').show(); $('.dual-only').css('display', 'block'); $('.form-row .dual-only').css('display', 'block'); } }
function closeModal() { $('#settings-modal').addClass('hidden'); currentEditingKey = null; }
function toggleGrid(checked) { snapToGrid = checked; checked ? $('#grid-layer').removeClass('hidden') : $('#grid-layer').addClass('hidden'); }
function toggleEditMode(enable) {
    isEditMode = enable;
    if (enable) { $('#edit-overlay').fadeIn(); $('.hud-element').addClass('editable'); renderHud(); } 
    else { $('#edit-overlay').fadeOut(); $('.hud-element').removeClass('editable'); $('#chk-grid').prop('checked', false); toggleGrid(false); saveSettings(); renderHud(); }
}
function dragElement(e, el, key) {
    let startX = e.clientX, startY = e.clientY; let startLeft = el.position().left, startTop = el.position().top; let hasMoved = false;
    $(document).on('mousemove.drag', function(evt) {
        let dx = evt.clientX - startX; let dy = evt.clientY - startY; if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
        let newLeft = startLeft + dx; let newTop = startTop + dy;
        if (snapToGrid) { newLeft = Math.round(newLeft / GRID_SIZE) * GRID_SIZE; newTop = Math.round(newTop / GRID_SIZE) * GRID_SIZE; }
        el.css({ top: newTop, left: newLeft });
    });
    $(document).on('mouseup.drag', function() { $(document).off('.drag'); if (!hasMoved) openModal(key); else { indicators[key].x = (el.position().left / $(window).width()) * 100; indicators[key].y = (el.position().top / $(window).height()) * 100; } });
}
function openIOModal(mode) { $('#io-modal').removeClass('hidden'); let textarea = $('#io-textarea'); if (mode === 'export') { $('#io-title').text("EXPORT"); $('#btn-copy').show(); $('#btn-import').hide(); textarea.val(JSON.stringify(indicators, null, 2)); } else { $('#io-title').text("IMPORT"); $('#btn-copy').hide(); $('#btn-import').show(); textarea.val(""); } }
function closeIOModal() { $('#io-modal').addClass('hidden'); }
function exportConfig() { openIOModal('export'); }
function importConfig() { openIOModal('import'); }
function showNotification(message, isError = false) { let el = $('#custom-notification'); let icon = $('#notif-icon'); $('#notif-text').text(message); isError ? (el.addClass('error'), icon.attr('class', 'fa-solid fa-circle-exclamation')) : (el.removeClass('error'), icon.attr('class', 'fa-solid fa-circle-check')); el.removeClass('hidden'); setTimeout(() => { el.addClass('hidden'); }, 3000); }
function applyImport() { try { let parsed = JSON.parse($('#io-textarea').val()); if (!parsed.health && !parsed.stamina) throw new Error("Neplatná data."); indicators = JSON.parse(JSON.stringify(defaultSettings)); $.extend(true, indicators, parsed); renderHud(); saveSettings(); closeIOModal(); showNotification("Nahráno!"); } catch (e) { showNotification("Chyba: " + e.message, true); } }
function copyToClipboard() { let ta = document.getElementById("io-textarea"); ta.select(); navigator.clipboard.writeText(ta.value).then(() => showNotification("Zkopírováno!")); }
function resetSettings() { indicators = JSON.parse(JSON.stringify(defaultSettings)); localStorage.removeItem('redm_hud_v7'); $.post('https://' + GetParentResourceName() + '/resetSettings', JSON.stringify({})); renderHud(); }
function closeEditMode() { saveSettings(); $.post('https://' + GetParentResourceName() + '/closeEdit', JSON.stringify({})); }
function saveSettings() { localStorage.setItem('redm_hud_v7', JSON.stringify(indicators)); $.post('https://' + GetParentResourceName() + '/saveSettings', JSON.stringify(indicators)); }
function loadSettings() { let saved = localStorage.getItem('redm_hud_v7'); if (saved) { let parsed = JSON.parse(saved); $.extend(true, indicators, defaultSettings, parsed); } }

function addNewElement() {
    let newId = "custom_" + Math.floor(Math.random() * 100000);
    indicators[newId] = {
        label: "NOVÝ", icon: "fa-solid fa-star", style: "circle", mode: "single",
        srcOuter: "", srcInner: "", colorOuter: "#ffffff", colorInner: "#ffffff", 
        colorBg: "rgba(0,0,0,0.5)", min: 0, maxOuter: 100, maxInner: 100, 
        speed: 400, scale: 1.0, showValue: true, x: 50, y: 50, enabled: true 
    };
    renderHud();
    openModal(newId);
    showNotification("Nový element přidán");
}
function deleteElement() { if (!currentEditingKey) return; delete indicators[currentEditingKey]; closeModal(); renderHud(); showNotification("Element odstraněn", true); }
function makeDraggable(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; var header = elmnt.querySelector(".drag-handle");
    if (header) { header.onmousedown = dragMouseDown; } else { elmnt.onmousedown = dragMouseDown; }
    function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
    function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.transform = "none"; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
}

// --- MATH HELPERS PRO SVG ---
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, radius, startAngle, endAngle) {
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}