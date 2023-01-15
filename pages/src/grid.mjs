import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';

const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_grid_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);
const grid_version = 1;
// let fieldStates;

let gameConnection;
const page = location.pathname.split('/').at(-1).split('.')[0];


const manifests = await common.rpc.getWindowManifests();
const descs = Object.fromEntries(manifests.map(x => [x.type, x]));
let desc = descs['watching'];

const default_widget_array = [
    {
        type: desc.type,
        file: desc.file,
        groupTitle: desc.groupTitle,
        prettyName: desc.prettyName,
        prettyDesc: desc.prettyDesc,
        id: desc.type+'-'+Date.now(),
        bounds: {
            x: 0,
            y: 0,
            w: 8,
            h: 10,
        },       
    },
];
  

common.settingsStore.setDefault({
    autoscroll: true,
    refreshInterval: 2,
    overlayMode: false,
    fontScale: 1,
    solidBackground: false,
    backgroundColor: '#00ff00',
    grid_version: grid_version,
    widgets: default_widget_array,
});

const settings = common.settingsStore.get();

if (settings.grid_version !== grid_version && grid_version == 1)
{
    console.log("grid version change: adapt");
    const updatedWidgets = settings.widgets.map(widget => {
        const updatedBounds = {
          ...widget.bounds,
          x: widget.bounds.x * 2,
          w: widget.bounds.w * 2,
        };
      
        return {
          ...widget,
          bounds: updatedBounds,
        };
      });
      common.settingsStore.set('widgets',updatedWidgets);
      common.settingsStore.set('grid_version',grid_version);   
}


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
    var toggleEdit = false;

    // common.settingsStore.addEventListener('changed', async ev => {
    //     const changed = ev.data.changed;
    //     if (changed.has('solidBackground') || changed.has('backgroundColor')) {
    //         setBackground();
    //     }
    //     if (window.isElectron && changed.has('overlayMode')) {
    //         await common.rpc.updateWindow(window.electron.context.id,
    //             {overlay: changed.get('overlayMode')});
    //         await common.rpc.reopenWindow(window.electron.context.id);
    //     }
    //     if (changed.has('refreshInterval')) {
    //         // setRefresh();
    //     }  

    //     render();
        
    // });
    if (window.isElectron) {
        const el = document.getElementById('content');
        const webServerURL = await common.rpc.getWebServerURL();
        const grid_url = webServerURL+descs['dosenhuhn_s4z_mods-dosenhuhn-grid'].file;
        //console.log(el);
        el.innerHTML = `<div>This is a browser only window!</div>
                        <div><a class="button" external target="_blank" href="${grid_url}">go to grid webpage</a></div>`;
        return;
    }        
    common.storage.addEventListener('update', async ev => {
        if (ev.data.key === fieldsKey) {
            //fieldStates = ev.data.value;
          //  render();
        }
    });

    setBackground();


    common.settingsStore.addEventListener('changed', ev => {
        const changed = ev.data.changed;
        if (changed.size === 1) {
            if (changed.has('solidBackground') || changed.has('backgroundColor')) {
                setBackground();
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
    //common.settingsStore.set('widgets',default_widget_array);
    let widgetArray = common.settingsStore.get('widgets') || default_widget_array;
    const options = {
        column: 24,
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
render(grid,widgetArray,false);
// for (const mywidget of widgetArray) {
//     grid.addWidget({x: mywidget.bounds.x, 
//                     y: mywidget.bounds.y, 
//                     w: mywidget.bounds.w,
//                     h: mywidget.bounds.h, 
//                     id: mywidget.id, 
//                     content:  `<iframe class="iframe rounded" src="${mywidget.file}?windowId=${mywidget.id}" title="${mywidget.prettyName}"></iframe>`
//                 }); //'<div class="move-icon"><ms>settings</ms></div>'+
// }


grid.on('resizestop', function(event, items) {
    const serializedFull = grid.save(true, true);
    const serializedData = serializedFull.children;
    let widgets = common.settingsStore.get('widgets');

    for (const widget of serializedData) {
        const bounds = {x: widget.x, y: widget.y, w: widget.w, h: widget.h};
        const objIndex = widgets.findIndex((obj => obj.id == widget.id));
        widgets[objIndex].bounds = bounds;
    }
    //console.log(widgets);
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
        document.addEventListener('click', async ev => {
            const a = ev.target.closest('header a[data-action]');
            if (!a) {
                return;
            }
            ev.preventDefault();
            //console.log(a.dataset.action);
            if (a.dataset.action === 'toggleEdit') {
                toggleEdit = !toggleEdit;
                document.getElementById('toggleEditBtn').classList.toggle('toggleEdit', !!toggleEdit);
                render(grid,widgetArray,toggleEdit);
            } else if (a.dataset.action === 'addWidget') {
                const type = ev.target.closest('.add-new').querySelector('select').value;
                const desc = descs[type];
                const mywidget = { 
                    type: desc.type,
                    file: desc.file,
                    groupTitle: desc.groupTitle,
                    prettyName: desc.prettyName,
                    prettyDesc: desc.prettyDesc,
                    id: desc.type+'-'+Date.now(),
                    bounds: {
                        w: 1,
                        h: 4,
                    },
                }
                const newgrid = grid.addWidget({
                    w: mywidget.bounds.w,
                    h: mywidget.bounds.h, 
                    id: mywidget.id, 
                    content:  `<div class="edit_mode"><span>${mywidget.prettyName}</span><div class"buttons"><a title="remove element" data-action="remove" data-id="${mywidget.id}"><ms>delete</ms></a></div></div>`
                });   
                //console.log(newgrid);   
                mywidget.bounds.x = parseInt(newgrid.getAttribute("gs-x"));       
                mywidget.bounds.y = parseInt(newgrid.getAttribute("gs-y"));
                widgetArray.push(mywidget);
                common.settingsStore.set('widgets',widgetArray);
                render(grid, widgetArray,toggleEdit);
            };
        });  
        
        document.querySelector('#content').addEventListener('click', ev => {
            ev.preventDefault();
            const a = ev.target.closest('a[data-action]');
            if (!a) {
                return;
            }
            if (a.dataset.action === "remove") {
                const objWithIdIndex = widgetArray.findIndex((obj) => obj.id === a.dataset.id);
                if (objWithIdIndex > -1) {
                    widgetArray.splice(objWithIdIndex, 1);
                }
                common.settingsStore.set('widgets',widgetArray);
                render(grid, widgetArray,toggleEdit);
            };
        });        
}


async function render(grid,widgetArray,toggleEdit) {
    grid.removeAll();
    if (toggleEdit)
    {
        document.getElementById('add-new').style.removeProperty('visibility');
        for (const mywidget of widgetArray) {
            grid.addWidget({x: mywidget.bounds.x, 
                            y: mywidget.bounds.y, 
                            w: mywidget.bounds.w,
                            h: mywidget.bounds.h, 
                            id: mywidget.id, 
                            content:  `<div class="edit_mode"><span>${mywidget.prettyName}</span><div class"buttons"><a title="remove element" data-action="remove" data-id="${mywidget.id}"><ms heavy>delete</ms></a></div></div>`
                        }); //'<div class="move-icon"><ms>settings</ms></div>'+
        }
        // const manifests = await common.rpc.getWindowManifests();
        // const descs = Object.fromEntries(manifests.map(x => [x.type, x]));
        const mGroups = new Map();
        for (const m of manifests.filter(x => !x.private)) {
            if (!mGroups.has(m.groupTitle)) {
                mGroups.set(m.groupTitle, []);
            }
            mGroups.get(m.groupTitle).push(m);
        }
        const el = document.querySelector('#titlebar');
        el.querySelector('.add-new select').innerHTML = Array.from(mGroups.entries()).map(([title, ms]) =>
            `<optgroup label="${common.sanitizeAttr(common.stripHTML(title || 'Main'))}">${ms.map(x =>
                `<option title="${common.sanitizeAttr(common.stripHTML(x.prettyDesc))}"
                         value="${x.type}">${common.stripHTML(x.prettyName)}</option>`)}</optgroup>`
        ).join('');

        // el.addEventListener('click', async ev => {
        //     const a = ev.target.closest('header a[data-action]');
        //     if (!a) {
        //         return;
        //     }
        //     ev.preventDefault();
        //     console.log(a.dataset.action);
        //     if (a.dataset.action === 'addWidget') {
        //         const type = ev.target.closest('.add-new').querySelector('select').value;
        //         const desc = descs[type];
        //         const mywidget = { 
        //             type: desc.type,
        //             file: desc.file,
        //             groupTitle: desc.groupTitle,
        //             prettyName: desc.prettyName,
        //             prettyDesc: desc.prettyDesc,
        //             id: desc.type+'-'+Date.now(),
        //             bounds: {
        //                 w: 1,
        //                 h: 2,
        //             },
        //         }
        //         const newgrid = grid.addWidget({
        //             w: mywidget.bounds.w,
        //             h: mywidget.bounds.h, 
        //             id: mywidget.id, 
        //             content:  `<div class="edit_mode"><span>${mywidget.prettyName}</span><div class"buttons"><a title="remove element" data-action="remove" data-id="${mywidget.id}"><ms>delete</ms></a></div></div>`
        //         });   
        //         console.log(newgrid);   
        //         mywidget.bounds.x = parseInt(newgrid.getAttribute("gs-x"));       
        //         mywidget.bounds.y = parseInt(newgrid.getAttribute("gs-y"));
        //         widgetArray.push(new_widget);
        //         common.settingsStore.set('widgets',mywidget);
        //     };
        // });          
    }
    else
    {
        document.getElementById('add-new').style.setProperty('visibility','hidden');
        for (const mywidget of widgetArray) {
            grid.addWidget({x: mywidget.bounds.x, 
                            y: mywidget.bounds.y, 
                            w: mywidget.bounds.w,
                            h: mywidget.bounds.h, 
                            id: mywidget.id, 
                            content:  `<iframe class="iframe rounded" src="${mywidget.file}?windowId=${mywidget.id}" title="${mywidget.prettyName}"></iframe>`
                        }); //'<div class="move-icon"><ms>settings</ms></div>'+
        }
    }
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
                const value = watching.state.power / watching.athlete.ftp;
                doc.classList.toggle('solid-background', true);
                for (let i = powerZones.length - 1; i >= 0; i--) {
                    const z = powerZones[i];
                    if (value > z.from && value <= z.to) {
                        doc.style.setProperty('--background-color', colors[z.zone]);
                        break;
                    }
                }        
            });  
        }
        else
        {
            doc.style.setProperty('--background-color', backgroundColor);
        }
    } else {
        doc.style.removeProperty('--background-color');
    }
}



export async function settingsMain() {
    common.initInteractionListeners();
    //common.settingsStore.set('widgets',default_widget_array);
    await common.initSettingsForm('form#general')();
    await initWindowsPanel();
}


async function renderWindows() {
    const windows = Object.values(await common.rpc.getWindows()).filter(x => !x.private);
    //const manifests = await common.rpc.getWindowManifests();
    const el = document.querySelector('#windows');
   // const descs = Object.fromEntries(manifests.map(x => [x.type, x]));
    const widgetArray = common.settingsStore.get('widgets');
    windows.sort((a, b) => !!a.closed - !!b.closed);
    el.querySelector('table.active-windows tbody').innerHTML = widgetArray.map(x => {
        const desc = descs[x.type] || {
            prettyName: `Unknown window: ${x.type}`,
            prettyDesc: common.sanitizeAttr(JSON.stringify(x, null, 4)),
        };
        if (!x.bounds){
            return `<tr data-id="${x.id}" class="window 'open'"
            title="unknown format, please remove">
            <td class="name">unknown format, please remove</td>
            <td >-</td>
            <td >-</td>
            <td >-</td>
            <td >-</td>
            <td class="btn" title="Delete this window and its settings"
                ><a class="link danger win-delete"><ms>delete_forever</ms></a></td>
        </tr>            
            `;
        } 
        return `
            <tr data-id="${x.id}" class="window 'open'"
                title="${common.sanitizeAttr(desc.prettyDesc)}">
                <td class="name">${common.stripHTML(x.customName || desc.prettyName)}</td>
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
    // const manifests = await common.rpc.getWindowManifests();
    // const descs = Object.fromEntries(manifests.map(x => [x.type, x]));

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
    });
   
}
