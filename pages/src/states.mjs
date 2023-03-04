import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
//const fieldsKey = 'dosenhuhn_states_settings_v1';
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
    showSuperHint: false,
    blinkSuper: false,
    blinkValue : false,
    showSlope: false,
    smoothCount: 3,
});

const worldCourseDescs = [
    // CourseId is offered by api
    {worldId: 1 , courseId: 6 , name:'Watopia'       , nicename: 'Watopia'        , scaling: 0.5 }, 
    {worldId: 2 , courseId: 2 , name:'Richmond'      , nicename: 'Richmond'       , scaling: 1 },
    {worldId: 3 , courseId: 7 , name:'London'        , nicename: 'London'         , scaling: 1 },  
    {worldId: 4 , courseId: 8 , name:'NewYork'       , nicename: 'New York'       , scaling: 0.75}, 
    {worldId: 5 , courseId: 9 , name:'Innsbruck'     , nicename: 'Innsbruck'      , scaling: 1 },  
    {worldId: 6 , courseId: 10, name:'Bologna'       , nicename: 'Bologna'        , scaling: 1 },
    {worldId: 7 , courseId: 11, name:'Yorkshire'     , nicename: 'Yorkshire'      , scaling: 1 }, 
    {worldId: 8 , courseId: 12, name:'CritCity'      , nicename: 'Crit City'      , scaling: 1 }, 
    {worldId: 9 , courseId: 13, name:'MakuriIslands' , nicename: 'Makuri Islands' , scaling: 1 },
    {worldId: 10, courseId: 14, name:'France'        , nicename: 'France'         , scaling: 1 }, 
    {worldId: 11, courseId: 15, name:'Paris'         , nicename: 'Paris'          , scaling: 0.5 }, 
    {worldId: 12, courseId: 16, name:'GravelMountain', nicename: 'Gravel Mountain', scaling: 0.5 }, 
    {worldId: 13, courseId: 17, name:'Scotland'      , nicename: 'Scotland'       , scaling: 0.5 }, 
];

var grad_precision = 0;
const unit = x => `<abbr class="unit">${x}</abbr>`;
const spd = (v, entry) => H.pace(v, {precision: 0, suffix: false, html: true, sport: entry.state.sport})+'<br>' +unit('kph');
const pwr = v => v ? num(v)+ '<br>' + unit('W') : '-';
const hr = v => v ? num(v)+ '<br>' + unit('bpm') : '-';
const cad = v => v ? num(v)+ '<br>' + unit('rpm') : '-';
//const grad = v => num(v)+ '<br>' + unit('%');
const grad_v2 = v => num(v, {precision: grad_precision, fixed: true}) + unit('%');
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
    let settings = common.settingsStore.get();
    let smoothCount = common.settingsStore.get('smoothCount') || 3;
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
       // console.log(changed);
        if (changed.has('showSlope')) {
            showSlope();
        }
        if (changed.has('showSuperHint') || changed.has('blinkSuper') || changed.has('blinkValue')) {
            settings = common.settingsStore.get();
        }
        if (changed.has('smoothCount')) {
            smoothCount = changed.get('smoothCount');
        }        

        render();
        
    });

    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/imperialUnits') {
            L.setImperial(imperial = ev.data.value);
        } else if (ev.data.key === '/exteranlEventSite') {
            // eventSite = ev.data.value;
        }
    });
    setBackground();
    showSlope();
    render();
    // setRefresh();
    // let lastRefresh = 0;
    let athleteId;

    //let distance = null;
    let altitude = null;
    let gradient = 0;
    let gradient_arr = [0];
    let speed_arr = [0];
    let worldtime_old;
    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
            gradient_arr = [0];
            speed_arr = [0];
           // distance = null;
            altitude = null;
            worldtime_old = 0;
        }
        
        const scaling = worldCourseDescs.find(a=>a.courseId==watching.state.courseId).scaling || 1;
        const rawZ = watching.state.z != null ? watching.state.z : watching.state.altitude
        const altitude_new =  rawZ * scaling;  //  - 9000
        
        //const distance_new = watching.state.eventDistance;
        const worldtime_new = watching.state.worldTime;
        //console.log(watching.state);
        
        if (!worldtime_old)
        {
            worldtime_old = worldtime_new;
        }
        //console.log("course: " + watching.state.courseId);
        if (!altitude)
        {
            gradient = 0;
           // distance = 0;
            altitude = altitude_new;
        }
        const distance_new = watching.state.speed * (worldtime_new-worldtime_old)/60/60;
        //console.log(distance_new);
        // if (Math.abs(distance_new - distance) > 500)
        // {
        //     gradient = 0;
        //     distance = distance_new;
        //     altitude = altitude_new;
        // }
        // else if (Math.abs(distance_new - distance) > 0)
        // {
        //     gradient = ((altitude_new - altitude) / Math.abs(distance_new - distance));
        //     gradient_arr.push(gradient);
        //     speed_arr.push(watching.state.speed);
        //     distance = distance_new
        //     altitude = altitude_new;
        // }
        if (distance_new > 0)
        {
            gradient = ((altitude_new - altitude) / distance_new);
            gradient_arr.push(gradient);
            speed_arr.push(watching.state.speed);
            //distance = distance_new
            altitude = altitude_new;
        }        
        //console.log(smoothCount);
        while (gradient_arr.length > smoothCount)
        {
            gradient_arr.shift();
            speed_arr.shift();
        }
        //console.log(watching.state.worldTime-worldtime_old);

        worldtime_old = watching.state.worldTime;
        //console.log(gradient_arr);
        const gradient_average = gradient_arr.reduce((a, b) => a + b, 0) / gradient_arr.length;
        const speed_average = speed_arr.reduce((a, b) => a + b, 0) / speed_arr.length;

        if(page == 'states'){ 
            document.getElementById('act_speed').innerHTML = spd(watching.state.speed,watching);
            document.getElementById('act_pwr').innerHTML = (gradient > 3.4) ? fmtWkg(watching.state.power,watching) : pwr(watching.state.power);
            document.getElementById('act_wbal').innerHTML = wbalpct(watching.stats.power.wBal,watching); 
            document.getElementById('act_hr').innerHTML = hr(watching.state.heartrate);
            //document.getElementById('act_grd').innerHTML = grad(gradient_average);
            document.getElementById('act_cad').innerHTML = cad(watching.state.cadence);
            setSuperTuck(gradient_average,speed_average,settings.showSuperHint,settings.blinkSuper, settings.blinkValue);                      
        } else {
            document.getElementById('act_grd').innerHTML = grad_v2(gradient_average);
            setSuperTuck(gradient_average,speed_average,settings.showSuperHint,settings.blinkSuper, settings.blinkValue);
        } 
        setGradientColor(gradient_average);
    });    
}



function render() {
    doc.style.setProperty('--font-scale', common.settingsStore.get('fontScale') || 1);
}

function setSuperTuck(gradient, speed, boShow, boblinkSuper, boblinkValue) {
    const super_dom = document.getElementById('super_svg') || false;
    const grd_dom = document.getElementById('act_grd') || false;
    if (boShow)
    {    
        if ((gradient < -3) && (speed > 58))
        {
            if(super_dom) super_dom.classList.toggle('boblinkSuper', !!boblinkSuper);
            if(grd_dom) grd_dom.classList.toggle('boblinkValue', !!boblinkValue);
        }
        else
        {
            if(super_dom) super_dom.classList.toggle('boblinkSuper', false);
            if(grd_dom) grd_dom.classList.toggle('boblinkValue', false);
        }
    }
    else
    {
        if(super_dom) super_dom.classList.toggle('boblinkSuper', false);
        if(grd_dom) grd_dom.classList.toggle('boblinkValue', false);        
    }
}

function setGradientColor(gradient) {
    const grd_dom = document.getElementById('act_grd') || false;
    if (grd_dom)
    {
        if (gradient >= 10)
        {
            grd_dom.style.setProperty('color', 'red');
        }  
        else if (gradient > 6)
        {
            grd_dom.style.setProperty('color', 'orange');
        }
        else if (gradient >= 3)
        {
            grd_dom.style.setProperty('color', 'yellow');
        }
        else
        {
            grd_dom.style.removeProperty('color');
        }
    }
    
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

function showSlope() {
    const grd_dom = document.getElementById('act_grd') || false;
    if (grd_dom)
    {
        const {showSlope} = common.settingsStore.get();
        grd_dom.classList.toggle('showSlope', !!showSlope);
    }

}


export async function settingsMain() {
    common.initInteractionListeners();
    await common.initSettingsForm('form#general')();
    //await initWindowsPanel();
}

