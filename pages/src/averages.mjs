import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
//const fieldsKey = 'dosenhuhn_averages_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);

let gameConnection;




  

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#00ff00',
});


const spd = (v, entry) => H.pace(v, {precision: 0, suffix: true, html: true, sport: entry.state.sport});
const pwr = v => H.power(v, {suffix: true, html: true});
const hr = v => v ? num(v) : '-';


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
        } 
    });
    setBackground();

    // common.settingsStore.addEventListener('changed', ev => {
    //     const changed = ev.data.changed;
    //     if (changed.size === 1) {
    //         if (changed.has('backgroundColor')) {
    //             setBackground();
    //         } else if (changed.has('/imperialUnits')) {
    //             imperial = changed.get('/imperialUnits');
    //         } else if (!changed.has('/theme')) {
    //             location.reload();
    //         }
    //     } else {
    //         location.reload();
    //     }
    // });
    
    let athleteId;
    

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
        }
       
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
    await common.initSettingsForm('form#general')();
    //await initWindowsPanel();
}
