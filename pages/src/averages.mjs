import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_averages_settings_v1';
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
const spd = (v, entry) => H.pace(v, {precision: 0, suffix: true, html: true, sport: entry.state.sport});
const weightClass = v => H.weightClass(v, {suffix: true, html: true});
const pwr = v => H.power(v, {suffix: true, html: true});
const hr = v => v ? num(v) : '-';
const kj = (v, options) => v != null ? num(v, options) + unit('kJ') : '-';
const pct = v => (v != null && !isNaN(v) && v !== Infinity && v !== -Infinity) ? num(v) + unit('%') : '-';
const gapTime = (v, entry) => H.timer(v) + (entry.isGapEst ? '<small> (est)</small>' : '');
const wbal =  (x, entry) => (x != null && entry.athlete && entry.athlete.wPrime) ?
                common.fmtBattery(x / entry.athlete.wPrime) + kj(x / 1000, {precision: 1}) : '-'

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

function render() {

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
    

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }


        sport = watching.state.sport || 'cycling';
       
        //console.log(incline_avg);
        document.getElementById('1min_pwr').innerHTML = pwr(watching.stats.power.smooth[60]);
        document.getElementById('5min_pwr').innerHTML = pwr(watching.stats.power.smooth[300]);
        document.getElementById('20min_pwr').innerHTML = pwr(watching.stats.power.smooth[1200]);

        document.getElementById('1min_pwr_peak').innerHTML = pwr(watching.stats.power.peaks[60].avg);
        document.getElementById('5min_pwr_peak').innerHTML = pwr(watching.stats.power.peaks[300].avg);
        document.getElementById('20min_pwr_peak').innerHTML = pwr(watching.stats.power.peaks[1200].avg);
        // document.getElementById('5min_wkg_peak').innerHTML = fmtWkg(watching.stats.power.smooth[300]*0.95,watching);   
        // document.getElementById('20min_wkg_peak').innerHTML = fmtWkg(watching.stats.power.smooth[1200]*0.95,watching);      
        
        document.getElementById('1min_spd').innerHTML = spd(watching.stats.speed.smooth[60],watching);
        document.getElementById('5min_spd').innerHTML = spd(watching.stats.speed.smooth[300],watching);
        document.getElementById('20min_spd').innerHTML = spd(watching.stats.speed.smooth[1200],watching);

        document.getElementById('1min_hr').innerHTML = hr(watching.stats.hr.smooth[60]);
        document.getElementById('5min_hr').innerHTML = hr(watching.stats.hr.smooth[300]);
        document.getElementById('20min_hr').innerHTML = hr(watching.stats.hr.smooth[1200]);


        //update_chart(watching.stats.power.timeInZones || []);
    });    
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
