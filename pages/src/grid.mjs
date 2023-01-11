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
        type: 'overview',
        content: '<iframe class="iframe rounded" src="../../../pages/overview.html?windowId=overview"  title="overview" style=" border: none; width: 100%;height: 100%"></iframe>',
        bonds: {
            x: 0,
            y: 0,
            w: 12,
            h: 2
        },        
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
        "type": "dosenhuhn_s4z_mods-dosenhuhn-nearby",
        "file": "/mods/dosenhuhn_s4z_mods/pages/nearby.html",
        "groupTitle": "[MOD]: DosenHuhn MODs for S4Z",
        "prettyName": "DH MOD - nearby",
        "prettyDesc": "change of nearby window to show (watching) teams",
        "overlay": true,
        "id": "user-dosenhuhn_s4z_mods-dosenhuhn-nearby-1673094536036-889544",
        "bounds": {
            x: 0,
            y: 9,
            w: 8,
            h: 10,
        },
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
  
const new_widget_array = [
    {
        type: "dosenhuhn_s4z_mods-dosenhuhn-nearby",
        file: "/mods/dosenhuhn_s4z_mods/pages/nearby.html",
        groupTitle: "[MOD]: DosenHuhn MODs for S4Z",
        prettyName: "DH MOD - nearby",
        prettyDesc: "change of nearby window to show (watching) teams",
        overlay: true,
        id: "user-dosenhuhn_s4z_mods-dosenhuhn-nearby-1673094536036-889544",
        bounds: {
            x: 0,
            y: 9,
            w: 8,
            h: 10,
        },
       // content: '<iframe class="iframe rounded" src="./nearby.html?windowId=nearby_left" title="nearby" style=" border: none; width: 100%; height: 100%"></iframe>'
    },
]

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

    let widgetArray = common.settingsStore.get('widgets')//; || default_widget_array;
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
    grid.addWidget({x: mywidget.bounds.x, 
                    y: mywidget.bounds.y, 
                    w: mywidget.bounds.w,
                    h: mywidget.bounds.h, 
                    id: mywidget.id, 
                    content:  `<iframe class="iframe rounded" src="${mywidget.file}?windowId=${mywidget.id}" title="${mywidget.prettyName}"></iframe>`
                }); //'<div class="move-icon"><ms>settings</ms></div>'+
}


grid.on('resizestop', function(event, items) {
    const serializedFull = grid.save(true, true);
    const serializedData = serializedFull.children;
    let widgets = common.settingsStore.get('widgets');

    for (const widget of serializedData) {
        const bounds = {x: widget.x, y: widget.y, w: widget.w, h: widget.h};
        const objIndex = widgets.findIndex((obj => obj.id == widget.id));
        widgets[objIndex].bounds = bounds;
    }
    console.log(widgets);
     common.settingsStore.set('widgets', widgets);
});

grid.on('dragstop', function (event, el) {
    var serializedFull = grid.save(true, true);
    var serializedData = serializedFull.children;
    let widgets = common.settingsStore.get('widgets');
    
    for (const widget of serializedData) {
        const bounds = {x: widget.x, y: widget.y, w: widget.w, h: widget.h};
        const objIndex = widgets.findIndex((obj => obj.id == widget.id));
        widgets[objIndex].bounds = bounds;
     }
    common.settingsStore.set('widgets', widgets);
 });
        //update_chart(watching.stats.power.timeInZones || []);
    
}



function render() {

}

//var athleteId;
function setBackground() {
    const {solidBackground, backgroundColor, backgroundPowerZone} = common.settingsStore.get();
    doc.classList.toggle('solid-background', !!solidBackground);
    if (solidBackground) {
        if (backgroundPowerZone) {
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
//                        document.body.style.setProperty('background-color', colors[z.zone]);
                        doc.style.setProperty('background-color', colors[z.zone]);
                        break;
                    }
                }        
            });  
        }
        else
        {
            doc.style.setProperty('background-color', backgroundColor);
        }
    } else {
        doc.style.removeProperty('--background-color');
    }
}

export async function settingsMain() {
    common.initInteractionListeners();
    await common.initSettingsForm('form#general')();
    await initWindowsPanel();
}


async function renderWindows() {
    const windows = Object.values(await common.rpc.getWindows()).filter(x => !x.private);
    const manifests = await common.rpc.getWindowManifests();
    const el = document.querySelector('#windows');
    const descs = Object.fromEntries(manifests.map(x => [x.type, x]));
    const widgetArray = common.settingsStore.get('widgets');
    console.log(widgetArray);
    console.log(descs);
    console.log(windows);
    windows.sort((a, b) => !!a.closed - !!b.closed);
    el.querySelector('table.active-windows tbody').innerHTML = widgetArray.map(x => {
        const desc = descs[x.type] || {
            prettyName: `Unknown window: ${x.type}`,
            prettyDesc: common.sanitizeAttr(JSON.stringify(x, null, 4)),
        };
        return `
            <tr data-id="${x.id}" class="window ${x.closed ? 'closed' : 'open'}"
                title="${common.sanitizeAttr(desc.prettyDesc)}\n\nDouble click/tap to ${x.closed ? 'reopen' : 'focus'}">
                <td class="name">${common.stripHTML(x.customName || desc.prettyName)}<a class="link win-edit-name"
                    title="Edit name"><ms>edit</ms></a></td>
                <td >${x.bounds.x}</td>
                <td >${x.bounds.y}</td>
                <td >${x.bounds.w}</td>
                <td >${x.bounds.h}</td>
                <td class="btn" title="Delete this window and its settings"
                    ><a class="link danger win-delete"><ms>delete_forever</ms></a></td>
            </tr>
        `;
    }).join('\n');
    const mGroups = new Map();
    for (const m of manifests.filter(x => !x.private)) {
        if (!mGroups.has(m.groupTitle)) {
            mGroups.set(m.groupTitle, []);
        }
        mGroups.get(m.groupTitle).push(m);
    }
    el.querySelector('.add-new select').innerHTML = Array.from(mGroups.entries()).map(([title, ms]) =>
        `<optgroup label="${common.sanitizeAttr(common.stripHTML(title || 'Main'))}">${ms.map(x =>
            `<option title="${common.sanitizeAttr(common.stripHTML(x.prettyDesc))}"
                     value="${x.type}">${common.stripHTML(x.prettyName)}</option>`)}</optgroup>`
    ).join('');
}

async function removeWindow(id) {
    const widgetArray = common.settingsStore.get('widgets');
    const objWithIdIndex = widgetArray.findIndex((obj) => obj.id === id);
    if (objWithIdIndex > -1) {
        widgetArray.splice(objWithIdIndex, 1);
    }
    common.settingsStore.set('widgets',widgetArray);
    renderWindows();
}

async function initWindowsPanel() {
    await Promise.all([
        //renderProfiles(),
        renderWindows(),
        //renderAvailableMods(),
    ]);
    const winsEl = document.querySelector('#windows');
    const manifests = await common.rpc.getWindowManifests();
    const descs = Object.fromEntries(manifests.map(x => [x.type, x]));

    winsEl.addEventListener('submit', ev => ev.preventDefault());
    winsEl.addEventListener('click', async ev => {
        const link = ev.target.closest('table a.link');
        if (!link) {
            return;
        }
        const id = ev.target.closest('[data-id]').dataset.id;
        if (link.classList.contains('win-restore')) {
            //await common.rpc.openWindow(id);
        } else if (link.classList.contains('profile-select')) {
            //await common.rpc.activateProfile(id);
            //await renderProfiles();
            await renderWindows();
        } else if (link.classList.contains('win-delete')) {
            console.log("delete",id);
            await removeWindow(id);
            //await common.rpc.removeWindow(id);
        } else if (link.classList.contains('profile-delete')) {
            //await common.rpc.removeProfile(id).catch(e => alert(`Remove Error\n\n${e.message}`));
            //await renderProfiles();
        } else if (link.classList.contains('profile-clone')) {
            //await common.rpc.cloneProfile(id).catch(e => alert(`Clone Error\n\n${e.message}`));
            //await renderProfiles();
        } else if (link.classList.contains('profile-export')) {
            // const data = await common.rpc.exportProfile(id);
            // const f = new File([JSON.stringify(data)], `${data.profile.name}.json`, {type: 'application/json'});
            // const l = document.createElement('a');
            // l.download = f.name;
            // l.style.display = 'none';
            // l.href = URL.createObjectURL(f);
            // try {
            //     document.body.appendChild(l);
            //     l.click();
            // } finally {
            //     URL.revokeObjectURL(l.href);
            //     l.remove();
            // }
        }  
    });

    winsEl.querySelector('.add-new input[type="button"]').addEventListener('click', async ev => {
        ev.preventDefault();
        const type = ev.currentTarget.closest('.add-new').querySelector('select').value;
        // const id = await common.rpc.createWindow({type});
        // await common.rpc.openWindow(id);
        
        
        const widgetArray = common.settingsStore.get('widgets');
        const desc = descs[type];
        const new_widget = { 
            type: desc.type,
            file: desc.file,
            groupTitle: desc.groupTitle,
            prettyName: desc.prettyName,
            prettyDesc: desc.prettyDesc,
            id: desc.type+'-'+Date.now(),
            bounds: {x: 2,
                y: 2,
                w: 2,
                h: 4,
            },
        }
        widgetArray.push(new_widget);
        common.settingsStore.set('widgets',widgetArray);
        await renderWindows();
        //console.log("new window: ", new_widget);
    });
   
}
