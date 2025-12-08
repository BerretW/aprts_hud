// Výchozí nastavení
const defaultSettings = {
    health: { label: "HP", colorFg: "#d93838", colorBg: "#4a1212", value: 100, style: 'bar', scale: 1.0, x: 2, y: 90, enabled: true },
    stamina: { label: "STA", colorFg: "#d9a838", colorBg: "#4a3812", value: 100, style: 'bar', scale: 1.0, x: 10, y: 90, enabled: true },
    hunger: { label: "JÍDLO", colorFg: "#38d960", colorBg: "rgba(0,0,0,0.5)", value: 80, style: 'circle', scale: 1.0, x: 18, y: 88, enabled: true },
    thirst: { label: "PITÍ", colorFg: "#388bd9", colorBg: "rgba(0,0,0,0.5)", value: 90, style: 'circle', scale: 1.0, x: 22, y: 88, enabled: true }
};

let indicators = JSON.parse(JSON.stringify(defaultSettings));
let isEditMode = false;
let currentEditingKey = null;

$(document).ready(function() {
    loadSettings();
    renderHud();

    // Slider listener
    $('#input-scale').on('input', function() { $('#scale-val').text($(this).val()); });

    window.addEventListener('message', function(event) {
        let data = event.data;
        if (data.type === "updateHUD") updateValues(data.status);
        else if (data.type === "toggleEdit") toggleEditMode(data.enable);
        else if (data.type === "loadSettings") {
            if (data.settings && Object.keys(data.settings).length > 0) {
                $.extend(true, indicators, data.settings);
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

        el.html(generateInnerHtml(key, data));

        el.on('mousedown', function(e) {
            if (!isEditMode) return;
            dragElement(e, $(this), key);
        });

        $('#hud-container').append(el);

        // !!! ZDE JE ZMĚNA PRO KNIHOVNU !!!
        // Pokud je styl 'circle', musíme inicializovat plugin
        if (data.style === 'circle') {
            initCircleProgress(key, data);
        }
        
        // Aplikace barev pro ostatní styly
        if (data.style !== 'circle') {
            updateVisuals(key, data);
        }
    }
}

function generateInnerHtml(key, data) {
    if (data.style === 'bar') {
        return `
            <div class="style-bar">
                <div class="label">${data.label}</div>
                <div class="bar-fill"></div>
            </div>
        `;
    } else if (data.style === 'circle') {
        // Pouze kontejner, canvas si vytvoří knihovna sama
        return `
            <div class="style-circle">
                <div class="circle-text">${Math.round(data.value)}</div>
            </div>
        `;
    } else {
        return `<div class="style-text">${data.label}: <span>${Math.round(data.value)}</span></div>`;
    }
}

// Inicializace Circle Progress pluginu
function initCircleProgress(key, data) {
    let el = $(`#${key} .style-circle`);
    
    el.circleProgress({
        value: data.value / 100, // Knihovna bere 0.0 až 1.0
        size: 60,                // Velikost v px (stejná jako v CSS)
        startAngle: -Math.PI / 2,// Začátek nahoře (12 hodin)
        thickness: 6,            // Tloušťka linky
        lineCap: 'round',        // Kulaté konce
        fill: { color: data.colorFg }, // Barva popředí
        emptyFill: data.colorBg        // Barva pozadí
    });
}

function updateVisuals(key, data) {
    let el = $(`#${key}`);
    
    if (data.style === 'bar') {
        el.find('.style-bar').css('background', data.colorBg);
        el.find('.bar-fill').css('background', data.colorFg);
    } else if (data.style === 'circle') {
        // Pro update barev u circle-progress musíme změnit options a překreslit
        let circleEl = el.find('.style-circle');
        
        // Zkontrolujeme, zda je plugin inicializovaný
        if (circleEl.data('circle-progress')) {
            circleEl.circleProgress({
                fill: { color: data.colorFg },
                emptyFill: data.colorBg
            });
        }
    } else {
        el.find('.style-text').css({
            'color': data.colorFg,
            'background': data.colorBg
        });
    }
}

function updateValues(statusData) {
    for (const [key, val] of Object.entries(statusData)) {
        if (!indicators[key]) continue;
        
        indicators[key].value = val;
        let el = $(`#${key}`);

        if (indicators[key].style === 'bar') {
            el.find('.bar-fill').css('width', `${val}%`);
        } else if (indicators[key].style === 'circle') {
            // Update hodnoty v knihovně (0.0 - 1.0)
            let circleEl = el.find('.style-circle');
            if (circleEl.data('circle-progress')) {
                circleEl.circleProgress('value', val / 100);
            }
            // Update textu
            el.find('.circle-text').text(Math.round(val));
        } else {
            el.find('span').text(Math.round(val));
        }
    }
}

// --- MODAL, EDIT, SAVE (Zbytek zůstává stejný, jen zkráceně pro kontext) ---

function openModal(key) {
    currentEditingKey = key;
    let data = indicators[key];
    $('#input-style').val(data.style);
    $('#input-color-fg').val(data.colorFg);
    
    // Konverze rgba na hex pro input type="color" není triviální, 
    // předpokládáme že uživatel používá HEX. Pokud máš v defaultu RGBA,
    // input type="color" to nevezme správně. Doporučuji používat v defaultu HEX.
    $('#input-color-bg').val(data.colorBg.startsWith('#') ? data.colorBg : "#000000");
    
    $('#input-scale').val(data.scale);
    $('#scale-val').text(data.scale);
    $('#input-enabled').prop('checked', data.enabled);
    $('#settings-modal').removeClass('hidden');
}

function closeModal() {
    $('#settings-modal').addClass('hidden');
    currentEditingKey = null;
}

function saveModal() {
    if (!currentEditingKey) return;
    let k = currentEditingKey;
    let oldStyle = indicators[k].style;

    indicators[k].style = $('#input-style').val();
    indicators[k].colorFg = $('#input-color-fg').val();
    indicators[k].colorBg = $('#input-color-bg').val();
    indicators[k].scale = parseFloat($('#input-scale').val());
    indicators[k].enabled = $('#input-enabled').is(':checked');

    // Pokud se změnil styl, musíme kompletně přerenderovat element,
    // protože circle-progress potřebuje čistý start nebo zničení canvasu.
    // Nejjednodušší je zavolat renderHud() nebo překreslit jen tento element.
    renderHud(); 
    closeModal();
}

function toggleEditMode(enable) {
    isEditMode = enable;
    if (enable) {
        $('#edit-overlay').fadeIn();
        $('.hud-element').addClass('editable');
        renderHud();
    } else {
        $('#edit-overlay').fadeOut();
        $('.hud-element').removeClass('editable');
        saveSettings();
        renderHud();
    }
}

function closeEditMode() {
    saveSettings();
    $.post('https://' + GetParentResourceName() + '/closeEdit', JSON.stringify({}));
}

function dragElement(e, el, key) {
    let startX = e.clientX;
    let startY = e.clientY;
    let startLeft = el.position().left;
    let startTop = el.position().top;
    let hasMoved = false;

    $(document).on('mousemove.drag', function(evt) {
        let dx = evt.clientX - startX;
        let dy = evt.clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
        el.css({ top: startTop + dy, left: startLeft + dx });
    });

    $(document).on('mouseup.drag', function() {
        $(document).off('.drag');
        if (!hasMoved) openModal(key);
        else {
            let percentX = (el.position().left / $(window).width()) * 100;
            let percentY = (el.position().top / $(window).height()) * 100;
            indicators[key].x = percentX;
            indicators[key].y = percentY;
        }
    });
}

function saveSettings() {
    localStorage.setItem('redm_hud_v3', JSON.stringify(indicators));
    $.post('https://' + GetParentResourceName() + '/saveSettings', JSON.stringify(indicators));
}

function loadSettings() {
    let saved = localStorage.getItem('redm_hud_v3');
    if (saved) {
        let parsed = JSON.parse(saved);
        $.extend(true, indicators, parsed);
    }
}