import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_states_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);

// let fieldStates;

let gameConnection;
const page = location.pathname.split('/').at(-1).split('.')[0];
//console.log(page);


  

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#00ff00',
});

const worldCourseDescs = [
    // CourseId is offered by api
    {worldId: 1 , courseId: 6 , name:'Watopia'       , nicename: 'Watopia'        , scaling: 0.5 }, // ok
    {worldId: 2 , courseId: 2 , name:'Richmond'      , nicename: 'Richmond'       , scaling: 1 },
    {worldId: 3 , courseId: 7 , name:'London'        , nicename: 'London'         , scaling: 1 },  // ok
    {worldId: 4 , courseId: 8 , name:'NewYork'       , nicename: 'New York'       , scaling: 0.75}, // ok
    {worldId: 5 , courseId: 9 , name:'Innsbruck'     , nicename: 'Innsbruck'      , scaling: 1 },   // ok
    {worldId: 6 , courseId: 10, name:'Bologna'       , nicename: 'Bologna'        , scaling: 1 },
    {worldId: 7 , courseId: 11, name:'Yorkshire'     , nicename: 'Yorkshire'      , scaling: 1 }, // ok
    {worldId: 8 , courseId: 12, name:'CritCity'      , nicename: 'Crit City'      , scaling: 1 }, // Confirm
    {worldId: 9 , courseId: 13, name:'MakuriIslands' , nicename: 'Makuri Islands' , scaling: 1 },
    {worldId: 10, courseId: 14, name:'France'        , nicename: 'France'         , scaling: 1 }, // ok
    {worldId: 11, courseId: 15, name:'Paris'         , nicename: 'Paris'          , scaling: 1 }, // ok
    {worldId: 12, courseId: 16, name:'GravelMountain', nicename: 'Gravel Mountain', scaling: 1 }, // Confirm
];


const unit = x => `<abbr class="unit">${x}</abbr>`;
const spd = (v, entry) => H.pace(v, {precision: 0, suffix: false, html: true, sport: entry.state.sport})+'<br>' +unit('kph');
const pwr = v => v ? num(v)+ '<br>' + unit('W') : '-';
const hr = v => v ? num(v)+ '<br>' + unit('bpm') : '-';
const grad = v => num(v)+ '<br>' + unit('%');
const grad_v2 = v => num(v) + unit('%');
//const kj = (v, options) => v != null ? num(v, options) + unit('kJ') : '-';
// const wbal =  (x, entry) => (x != null && entry.athlete && entry.athlete.wPrime) ?
//                 common.fmtBattery(x / entry.athlete.wPrime) + kj(x / 1000, {precision: 1}) : '-';

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
  
    // let refresh;
    // const setRefresh = () => {
    //     refresh = (common.settingsStore.get('refreshInterval') || 0) * 1000 - 100; // within 100ms is fine.
    // };
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
            // setRefresh();
        }  

        render();
        
    });
    common.storage.addEventListener('update', async ev => {
        if (ev.data.key === fieldsKey) {
            //fieldStates = ev.data.value;
            render();
        }
    });
    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/imperialUnits') {
            L.setImperial(imperial = ev.data.value);
        } else if (ev.data.key === '/exteranlEventSite') {
            // eventSite = ev.data.value;
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
    
    // setRefresh();
    // let lastRefresh = 0;
    let athleteId;

    let distance = null;
    let altitude = null;
    let gradient = 0;
    let gradient_arr = [0];

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
            gradient_arr = [0];
            distance = null;
            altitude = null;
        }
        
        const scaling = worldCourseDescs.find(a=>a.courseId==watching.state.courseId).scaling || 1;
        const altitude_new =  (watching.state.altitude - 9000) * scaling;
        
        // console.log("scaling: " + scaling);
        // const altitude_new = (watching.state.courseId == 6) ? altitude_to_scale * 0.5  :
        //                      (watching.state.courseId == 8) ? altitude_to_scale * 0.75 : altitude_to_scale *1;
        //const distance_new = watching.state.distance;
        const distance_new = watching.state.eventDistance;
        //console.log("course: " + watching.state.courseId);
        if (!distance || !altitude)
        {
            gradient = 0;
            distance = distance_new;
            altitude = altitude_new;
        }
        else if (Math.abs(distance_new - distance) > 0)
        {
            gradient = ((altitude_new - altitude) / Math.abs(distance_new - distance));
            gradient_arr.push(gradient);
            distance = distance_new
            altitude = altitude_new;
        }
        if (gradient_arr.length > 3)
        {
            gradient_arr.shift();
        }
        //console.log(gradient_arr);
        const gradient_average = gradient_arr.reduce((a, b) => a + b, 0) / gradient_arr.length;
        //console.log(gradient_average);

        if(page == 'states'){ 
            document.getElementById('act_speed').innerHTML = spd(watching.state.speed,watching);
            document.getElementById('act_pwr').innerHTML = (gradient > 3.4) ? fmtWkg(watching.state.power,watching) : pwr(watching.state.power);
            document.getElementById('act_wbal').innerHTML = wbalpct(watching.stats.power.wBal,watching); 
            document.getElementById('act_hr').innerHTML = hr(watching.state.heartrate);
            document.getElementById('act_grd').innerHTML = grad(gradient_average);
                      
        } else {
            document.getElementById('act_grd').innerHTML = grad_v2(gradient_average);
           // console.log(grad_v2(gradient)+ ' ' + gradient);   
        } 
          


        //update_chart(watching.stats.power.timeInZones || []);
    });    
}



function render() {

}

function setBackground() {
    const {solidBackground, backgroundColor} = common.settingsStore.get();
    doc.classList.toggle('solid-background', !!solidBackground);
    if (solidBackground) {
        doc.style.setProperty('--background-color', backgroundColor);
    } else {
        doc.style.removeProperty('--background-color');
    }
}


// export async function settingsMain() {
//     common.initInteractionListeners();
//     fieldStates = common.storage.get(fieldsKey);
//     const form = document.querySelector('form#fields');
//     form.addEventListener('input', ev => {
//         const id = ev.target.name;
//         fieldStates[id] = ev.target.checked;
//         common.storage.set(fieldsKey, fieldStates);
//     });
//     for (const {fields, label} of fieldGroups) {
//         form.insertAdjacentHTML('beforeend', [
//             '<div class="field-group">',
//                 `<div class="title">${label}:</div>`,
//                 ...fields.map(x => `
//                     <label title="${common.sanitizeAttr(x.tooltip || '')}">
//                         <key>${x.label}</key>
//                         <input type="checkbox" name="${x.id}" ${fieldStates[x.id] ? 'checked' : ''}/>
//                     </label>
//                 `),
//             '</div>'
//         ].join(''));
//     }
//     await common.initSettingsForm('form#options')();
// }
