import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';


const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_grid_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);

// let fieldStates;

let gameConnection;
const page = location.pathname.split('/').at(-1).split('.')[0];
//console.log(page);

const default_widget_array = [
    {
        id: 'overview_0',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
        content: '<iframe class="iframe rounded" src="../../../pages/overview.html?windowId=overview"  title="overview" style=" border: none; width: 100%;height: 100%"></iframe>'
    },
    {
        id: 'states_0',
        x: 0,
        y: 2,
        w: 3,
        h: 7,
        content: '<iframe class="iframe rounded" src="./states.html?windowId=states" style="border:none;width: 100%; height: 100%;" title="states"></iframe>'
    },
    {
        id: 'watching_2023',
        x: 3,
        y: 2,
        w: 3,
        h: 7,
        content: '<iframe class="iframe rounded" src="../../../pages/watching.html?windowId=watch_chart" style="border:none;width: 100%; height: 100%;" title="watch"></iframe>'
    },
    {
        id: 'powerdist_2023',
        x: 6,
        y: 2,
        w: 3,
        h: 7,
        content: '<iframe  class="iframe rounded" src="./powerdist.html?windowId=watch_powerin" style="border:none;width: 100%; height: 100%;" ></iframe>'
    },
    {
        id: 'averages_2023',
        x: 9,
        y: 2,
        w: 3,
        h: 7,
        content: '<iframe class="iframe rounded" src="./averages.html?windowsId=averages" style="border:none;width: 100%; height: 100%;" ></iframe>'
    },
    {
        id: 'nearby',
        x: 0,
        y: 9,
        w: 8,
        h: 10,
        content: '<iframe class="iframe rounded" src="./nearby.html?windowId=nearby_left" title="nearby" style=" border: none; width: 100%; height: 100%"></iframe>'
    },
    {
        id: 'groups_0',
        x: 8,
        y: 9,
        w: 2,
        h: 10,
        content: '<iframe class="iframe rounded" src="./groups.html?windowId=groups_left" title="description" style="border:none;width: 100%; height: 100%" ></iframe>'
    },                        
    {
        id: 'groups_1',
        x: 10,
        y: 9,
        w: 2,
        h: 10,
        content: '<iframe class="iframe rounded" src="./groups.html?windowId=groups_right" title="zoomed" style="border:none;width: 100%; height: 100%;" ></iframe>'
    }, 
];
  

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#00ff00',
    widgets: default_widget_array,
});

const settings = common.settingsStore.get();
console.log(settings);

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

    let widgetArray = common.settingsStore.get('widgets') || default_widget_array;
    const options = {
        cellHeight: 20,
        margin: 4,
        float: true,
        alwaysShowResizeHandle: false,
        resizable: {handles: 'ne,se,sw'},
        draggable: {
            handle: '.move-icon',
        }
    };
var grid = GridStack.init(options);
for (const mywidget of widgetArray) {
    grid.addWidget({x: mywidget.x, y: mywidget.y, w: mywidget.w,h:mywidget.h, id: mywidget.id, content:  mywidget.content}); //'<div class="move-icon"><ms>settings</ms></div>'+
}


grid.on('resizestop', function(event, items) {
    const serializedFull = grid.save(true, true);
    const serializedData = serializedFull.children;
    common.settingsStore.set('widgets', serializedData);
    console.log(serializedFull);
    console.log(serializedData);
});

grid.on('dragstop', function (event, el) {
    var serializedFull = grid.save(true, true);
    var serializedData = serializedFull.children;
    common.settingsStore.set('widgets', serializedData);
    console.log(serializedFull);
    console.log(serializedData);
});
        //update_chart(watching.stats.power.timeInZones || []);
    
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
