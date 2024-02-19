import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;

// const fieldsKey = 'dosenhuhn_pzc_settings_v1';
// let eventSite = common.storage.get('/externalEventSite', 'zwift');
// let fieldStates;

let gameConnection;

common.settingsStore.setDefault({
    opacity: 1,
    gradient: 100,
    gradienttype: 'farthest-corner',
    borderradius: 2
});

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

const opacity = common.settingsStore.get('opacity');
const gradient = common.settingsStore.get('gradient') || 100;
common.settingsStore.set('gradient',gradient);
const borderradius = common.settingsStore.get('borderradius') || 2;
common.settingsStore.set('borderradius',borderradius);
const gradienttype = common.settingsStore.get('gradienttype') ||'farthest-corner';
common.settingsStore.set('gradienttype',gradienttype);

var opacityhex = ('00' + (parseInt((255*opacity)).toString(16).toUpperCase())).slice(-2);
var bgcolor = "#000000"+opacityhex;

export async function main() {
    common.initInteractionListeners();
    //common.initNationFlags();  // bg okay
    //document.body.style.setProperty('background-color', "black");
 
    // doc.classList.toggle('solid-background', true);
    // let refresh;
    // const setRefresh = () => {
    //     refresh = (common.settingsStore.get('refreshInterval') || 0) * 1000 - 100; // within 100ms is fine.
    // };
    const gcs = await common.rpc.getGameConnectionStatus();

    doc.classList.toggle('solid-background', true);
    doc.style.setProperty('--background-color', bgcolor);
    doc.style.setProperty('--gradient-radius', gradient + '%'); 
    doc.style.setProperty('--gradient-type', gradienttype); 
    doc.style.setProperty('--border-radius', borderradius + 'mm');

    gameConnection = !!(gcs && gcs.connected);
    doc.classList.toggle('game-connection', gameConnection);
    common.subscribe('status', gcs => {
        gameConnection = gcs.connected;
        doc.classList.toggle('game-connection', gameConnection);
    }, {source: 'gameConnection'});
    common.settingsStore.addEventListener('changed', async ev => {
        const changed = ev.data.changed;
        if (window.isElectron && changed.has('overlayMode')) {
            await common.rpc.updateWindow(window.electron.context.id,
                {overlay: changed.get('overlayMode')});
            await common.rpc.reopenWindow(window.electron.context.id);
        }
        if (changed.has('opacity')) {
            const opacity = common.settingsStore.get('opacity');
            opacityhex = ('00' + (parseInt((255*opacity)).toString(16).toUpperCase())).slice(-2);
            bgcolor = (bgcolor.substring(0, 7)+opacityhex);
            doc.style.setProperty('--background-color', bgcolor); 
        }  
        if (changed.has('gradient')) {
            const gradient = common.settingsStore.get('gradient');
            doc.style.setProperty('--gradient-radius', gradient + '%'); 
        }
        if (changed.has('gradienttype')) {
            const gradienttype = common.settingsStore.get('gradienttype');
            doc.style.setProperty('--gradient-type', gradienttype); 
        }        
        if (changed.has('borderradius')) {
            const borderradius = common.settingsStore.get('borderradius');
            doc.style.setProperty('--border-radius', borderradius + 'mm'); 
        }          

     
    });

    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/exteranlEventSite') {
           // eventSite = ev.data.value;
        }
    });

    
    // setRefresh();
    // let lastRefresh = 0;
    let athleteId;
    
    let colors;
    let powerZones;
    
    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
             colors = null;
            powerZones = null;
            common.rpc.getPowerZones(1).then(zones =>{ powerZones = zones; colors = common.getPowerZoneColors(powerZones)});
        }
        if (!colors || !watching.athlete || !watching.athlete.ftp) {
            bgcolor = "#000000"+opacityhex;
            doc.style.setProperty('--background-color', bgcolor);
            return;
        }
        const value = watching.state.power / watching.athlete.ftp;
        //doc.classList.toggle('solid-background', true);
        //console.log(value);
                for (let i = powerZones.length - 1; i >= 0; i--) {
            const z = powerZones[i];
            if (z.zone != "SS" && value > z.from) {
                //document.body.style.setProperty('background-color', colors[z.zone]);
                // If a three-character hexcolor, make six-character
                let hexcolor=colors[z.zone];
                if (hexcolor.length === 4) {
                    hexcolor = '#'+hexcolor.substring(1, 4).split('').map(function (hex) {
                        return hex + hex;
                    }).join('');
                }
                bgcolor = hexcolor+opacityhex;
                doc.style.setProperty('--background-color', bgcolor);
                break;
            }
        }        
    });    
}



export async function settingsMain() {
    common.initInteractionListeners();
    await common.initSettingsForm('form#general')();
    //await initWindowsPanel();
}
