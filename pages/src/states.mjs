import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_states_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);
let eventSite = common.storage.get('/externalEventSite', 'zwift');
let fieldStates;
let nearbyData;
let enFields;
let sortBy;
let sortByDir;
let table;
let tbody;
let theadRow;
let gameConnection;
let sport = 'cycling';
let chart;
const defaultLineChartLen = Math.ceil(window.innerWidth / 2);


  

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#00ff00',
});

const unit = x => `<abbr class="unit">${x}</abbr>`;
const spd = (v, entry) => H.pace(v, {precision: 0, suffix: false, html: true, sport: entry.state.sport})+'<br>' +unit('kph');
const weightClass = v => H.weightClass(v, {suffix: true, html: true});
const pwr = v => v ? num(v)+ '<br>' + unit('W') : '-';
const hr = v => v ? num(v)+ '<br>' + unit('bpm') : '-';
const grad = v => num(v)+ '<br>' + unit('%');
const kj = (v, options) => v != null ? num(v, options) + unit('kJ') : '-';
const pct = v => (v != null && !isNaN(v) && v !== Infinity && v !== -Infinity) ? num(v) + unit('%') : '-';
const gapTime = (v, entry) => H.timer(v) + (entry.isGapEst ? '<small> (est)</small>' : '');
const wbal =  (x, entry) => (x != null && entry.athlete && entry.athlete.wPrime) ?
                common.fmtBattery(x / entry.athlete.wPrime) + kj(x / 1000, {precision: 1}) : '-';

const wbalpct =  (x, entry) => (x != null && entry.athlete && entry.athlete.wPrime) ?
            common.fmtBattery(x / entry.athlete.wPrime) + H.number(x / entry.athlete.wPrime*100) +'<br>' +unit('%') : '-';                

let overlayMode;
if (window.isElectron) {
    overlayMode = !!window.electron.context.spec.overlay;
    doc.classList.toggle('overlay-mode', overlayMode);
    document.querySelector('#titlebar').classList.toggle('always-visible', overlayMode !== true);
    if (common.settingsStore.get('overlayMode') !== overlayMode) {
        // Sync settings to our actual window state, not going to risk updating the window now
        common.settingsStore.set('overlayMode', overlayMode);
    }
}




function fmtWkg(v, entry) {
    if (v == null) {
        return '-';
    }
    const wkg = v / (entry.athlete && entry.athlete.weight);
    return (wkg !== Infinity && wkg !== -Infinity && !isNaN(wkg)) ?
        num(wkg, {precision: 1, fixed: true}) + '<br>' + unit('w/kg') :
        '-';
}


export async function main() {
    common.initInteractionListeners();
    //common.initNationFlags();  // bg okay
  
    let refresh;
    const setRefresh = () => {
        refresh = (common.settingsStore.get('refreshInterval') || 0) * 1000 - 100; // within 100ms is fine.
    };
    const gcs = await common.rpc.getGameConnectionStatus();

    gameConnection = !!(gcs && gcs.connected);
    doc.classList.toggle('game-connection', gameConnection);
    common.subscribe('status', gcs => {
        gameConnection = gcs.connected;
        doc.classList.toggle('game-connection', gameConnection);
    }, {source: 'gameConnection'});
    common.settingsStore.addEventListener('changed', async ev => {
        const changed = ev.data.changed;
        if (changed.has('solidBackground') || changed.has('backgroundColor')) {
            setBackground();
        }
        if (window.isElectron && changed.has('overlayMode')) {
            await common.rpc.updateWindow(window.electron.context.id,
                {overlay: changed.get('overlayMode')});
            await common.rpc.reopenWindow(window.electron.context.id);
        }
        if (changed.has('refreshInterval')) {
            setRefresh();
        }  

        render();
        
    });
    common.storage.addEventListener('update', async ev => {
        if (ev.data.key === fieldsKey) {
            fieldStates = ev.data.value;
            render();
        }
    });
    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/imperialUnits') {
            L.setImperial(imperial = ev.data.value);
        } else if (ev.data.key === '/exteranlEventSite') {
            eventSite = ev.data.value;
        }
    });
    setBackground();

    common.settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.size === 1) {
            if (changed.has('backgroundColor')) {
                setBackground();
            } else if (changed.has('/imperialUnits')) {
                imperial = changed.get('/imperialUnits');
            } else if (!changed.has('/theme')) {
                location.reload();
            }
        } else {
            location.reload();
        }
    });
    
    setRefresh();
    let lastRefresh = 0;
    let athleteId;

    let colors;
    let powerZones;
    let distance = null;
    let altitude = null;
    let gradient = 0;

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
            distance = null;
            altitude = null;
        }

      //  console.log(colors);
      //  console.log(powerZones);
        sport = watching.state.sport || 'cycling';
        //console.log(watching);
        const altitude_new = (watching.state.altitude - 9000) / 2;
        if (!distance || !altitude)
        {
            distance = watching.state.distance;
            altitude = altitude_new;
        }
        else if ((watching.state.distance - distance) > 10)
        {
            gradient = ((altitude_new - altitude) / (watching.state.distance - distance));
            distance = watching.state.distance;
            altitude = altitude_new;
    
        }

        document.getElementById('act_speed').innerHTML = spd(watching.state.speed,watching);
        document.getElementById('act_pwr').innerHTML = (gradient > 3.4) ? fmtWkg(watching.state.power,watching) : pwr(watching.state.power);
        document.getElementById('act_wbal').innerHTML = wbalpct(watching.stats.power.wBal,watching); 
        document.getElementById('act_hr').innerHTML = hr(watching.state.heartrate);   
        document.getElementById('act_grd').innerHTML = grad(gradient);   


        //update_chart(watching.stats.power.timeInZones || []);
    });    
}



function render() {

}


let frames = 0;



function setBackground() {
    const {solidBackground, backgroundColor} = common.settingsStore.get();
    doc.classList.toggle('solid-background', !!solidBackground);
    if (solidBackground) {
        doc.style.setProperty('--background-color', backgroundColor);
    } else {
        doc.style.removeProperty('--background-color');
    }
}


export async function settingsMain() {
    common.initInteractionListeners();
    fieldStates = common.storage.get(fieldsKey);
    const form = document.querySelector('form#fields');
    form.addEventListener('input', ev => {
        const id = ev.target.name;
        fieldStates[id] = ev.target.checked;
        common.storage.set(fieldsKey, fieldStates);
    });
    for (const {fields, label} of fieldGroups) {
        form.insertAdjacentHTML('beforeend', [
            '<div class="field-group">',
                `<div class="title">${label}:</div>`,
                ...fields.map(x => `
                    <label title="${common.sanitizeAttr(x.tooltip || '')}">
                        <key>${x.label}</key>
                        <input type="checkbox" name="${x.id}" ${fieldStates[x.id] ? 'checked' : ''}/>
                    </label>
                `),
            '</div>'
        ].join(''));
    }
    await common.initSettingsForm('form#options')();
}
