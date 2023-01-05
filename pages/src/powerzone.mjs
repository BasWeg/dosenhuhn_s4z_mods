import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;

// const fieldsKey = 'dosenhuhn_pzc_settings_v1';
// let eventSite = common.storage.get('/externalEventSite', 'zwift');
// let fieldStates;

let gameConnection;



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



export async function main() {
    common.initInteractionListeners();
    //common.initNationFlags();  // bg okay
    document.body.style.setProperty('background-color', "black");
    doc.style.setProperty('--background-color', "black");
    // doc.classList.toggle('solid-background', true);
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
        if (window.isElectron && changed.has('overlayMode')) {
            await common.rpc.updateWindow(window.electron.context.id,
                {overlay: changed.get('overlayMode')});
            await common.rpc.reopenWindow(window.electron.context.id);
        }
        if (changed.has('refreshInterval')) {
         //   setRefresh();
        }  

        render();
        
    });

    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/exteranlEventSite') {
           // eventSite = ev.data.value;
        }
    });


    common.settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.size === 1) {
            if (!changed.has('/theme')) {
                location.reload();
            }
        } else {
            location.reload();
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
        if (!colors) {
            return;
        }
        //console.log(colors);
        //console.log(powerZones);
        const value = watching.state.power / watching.athlete.ftp;
        doc.classList.toggle('solid-background', true);
        for (let i = powerZones.length - 1; i >= 0; i--) {
            const z = powerZones[i];
            if (value > z.from && value <= z.to) {
                document.body.style.setProperty('background-color', colors[z.zone]);
                doc.style.setProperty('--background-color', colors[z.zone]);
                break;
            }
        }        
       // doc.style.setProperty('background-color', backgroundColor);
        //console.log(incline_avg);


        //update_chart(watching.stats.power.timeInZones || []);
    });    
}


function render() {

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
