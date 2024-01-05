import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';

const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;

const fieldsKey = 'dosenhuhn_grid_settings_v1';

let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);
const grid_version = 2;
// let fieldStates;

const manifests = await common.rpc.getWidgetWindowManifests();
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

const default_profiles_array = [
    {
        id: Date.now(),
        name: "default",
        active: true,
        widgets:  default_widget_array      
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
    profiles: default_profiles_array,
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

if (settings.grid_version !== grid_version && grid_version == 2)
{
    console.log("grid version change: adapt");
    const new_profiles = [
        {
            id: Date.now(),
            name: "default",
            active: true,
            widgets:  settings.widgets      
        },
    ];
    common.settingsStore.set('profiles',new_profiles);
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

    //common.settingsStore.set('widgets',default_widget_array);
    let widgetArray = getActiveWidgets() || default_widget_array;// common.settingsStore.get('widgets') || default_widget_array;
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

    // eslint-disable-next-line no-undef
    var grid = GridStack.init(options);
    render(grid,widgetArray,false);

    // eslint-disable-next-line no-unused-vars
    grid.on('resizestop', function(_event, _items) {
        const serializedFull = grid.save(true, true);
        const serializedData = serializedFull.children;
        let widgets = getActiveWidgets();//common.settingsStore.get('widgets');

        for (const widget of serializedData) {
            const bounds = {x: widget.x, y: widget.y, w: widget.w, h: widget.h};
            const objIndex = widgets.findIndex((obj => obj.id == widget.id));
            widgets[objIndex].bounds = bounds;
        }
        //console.log(widgets);
        setActiveWidgets(widgets);//common.settingsStore.set('widgets', widgets);
    });

    // eslint-disable-next-line no-unused-vars
    grid.on('dragstop', function (_event, _el) {
        var serializedFull = grid.save(true, true);
        var serializedData = serializedFull.children;
        let widgets = getActiveWidgets();//common.settingsStore.get('widgets');
        
        for (const widget of serializedData) {
            const bounds = {x: widget.x, y: widget.y, w: widget.w, h: widget.h};
            const objIndex = widgets.findIndex((obj => obj.id == widget.id));
            widgets[objIndex].bounds = bounds;
        }
        setActiveWidgets(widgets)//common.settingsStore.set('widgets', widgets);
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
            setActiveWidgets(widgetArray);//common.settingsStore.set('widgets',widgetArray);
            render(grid, widgetArray,toggleEdit);
        }
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
            setActiveWidgets(widgetArray);//common.settingsStore.set('widgets',widgetArray);
            render(grid, widgetArray,toggleEdit);
        }
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
                    if (value > z.from) {
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
    const windows = Object.values(await common.rpc.getWidgetWindowSpecs()).filter(x => !x.private);
    const el = document.querySelector('#windows');
    const widgetArray = getActiveWidgets();
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
    const widgetArray = getActiveWidgets();
    const objWithIdIndex = widgetArray.findIndex((obj) => obj.id === id);
    if (objWithIdIndex > -1) {
        widgetArray.splice(objWithIdIndex, 1);
    }
    setActiveWidgets(widgetArray);
    renderWindows();
    renderProfiles();
}

async function renameProfile(id, name)
{
    const profiles = common.settingsStore.get('profiles') || [];
    const ProfileId = profiles.findIndex((obj) => obj.id === id*1);
    profiles[ProfileId].name = name;
    common.settingsStore.set('profiles', profiles);
}

async function removeProfile(id)
{
    const profiles = common.settingsStore.get('profiles') || [];
    const ProfileId = profiles.findIndex((obj) => obj.id === id*1);
    if (ProfileId > -1) {
        profiles.splice(ProfileId, 1);
    }
    common.settingsStore.set('profiles', profiles);  
}

async function createProfile()
{
    const profiles = common.settingsStore.get('profiles') || [];
    const new_profile = {
            id: Date.now(),
            name: "new",
            active: false,
            widgets:  []      
        };
    profiles.push(new_profile);
    common.settingsStore.set('profiles', profiles);
}

async function importProfile(data)
{
    const profiles = common.settingsStore.get('profiles') || [];
    data.id = Date.now(); // new id
    data.active = false; // overwrite active
    profiles.push(data);
    common.settingsStore.set('profiles', profiles);
}

function getActiveWidgets() {
    const profiles = common.settingsStore.get('profiles') || [];
    const ActiveId = profiles.findIndex((obj) => obj.active === true);
    return profiles[ActiveId].widgets;
}

function setActiveWidgets(widgets) {
    const profiles = common.settingsStore.get('profiles') || [];
    const ActiveId = profiles.findIndex((obj) => obj.active === true);
    profiles[ActiveId].widgets = widgets;
    common.settingsStore.set('profiles',profiles);
}

async function renderProfiles() {
    const profiles = common.settingsStore.get('profiles') || [];
    const el = document.querySelector('#windows');
    el.querySelector('table.profiles tbody').innerHTML = profiles.map((x) => {
        return `
            <tr data-id="${x.id}" class="profile ${x.active ? 'active' : 'closed'}">
                <td class="name">${common.stripHTML(x.name)}<a class="link profile-edit-name"
                    title="Edit name"><ms>edit</ms></a></td>
                <td class="windows">${H.number(Object.keys(x.widgets).length)}</td>
                <td class="btn">${x.active ? 'Current' : '<a class="link profile-select">Activate</a>'}</td>
                <td class="btn" title="Export this profile to a file"
                    ><a class="link profile-export"><ms>download</ms></a></td>
                <td class="btn" title="Duplicate this profile"
                    ><a class="link profile-clone"><ms>file_copy</ms></a></td>
                <td class="btn" title="Delete this profile"
                    >${x.active ? '' : '<a class="link danger profile-delete"><ms>delete_forever</ms></a>'}</td>
            </tr>
        `;
    }).join('\n');
}

async function initWindowsPanel() {
    await Promise.all([
        renderWindows(),
        renderProfiles(),        
    ]);
    const winsEl = document.querySelector('#windows');

    winsEl.addEventListener('submit', ev => ev.preventDefault());
    winsEl.addEventListener('click', async ev => {
        const link = ev.target.closest('table a.link');
        if (!link) {
            console.log("nope");
            return;
        }
        const id = ev.target.closest('[data-id]').dataset.id;
        const profilesarray = common.settingsStore.get('profiles')
        if (link.classList.contains('win-restore')) {
            //await common.rpc.openWindow(id);
        } else if (link.classList.contains('profile-select')) {
            const objWithIdIndex = profilesarray.findIndex((obj) => obj.id === id*1);
            const oldActiveId = profilesarray.findIndex((obj) => obj.active === true);
            profilesarray[oldActiveId].active = false;
            profilesarray[objWithIdIndex].active = true;
            //common.settingsStore.set('widgets',profilesarray[objWithIdIndex].widgets);
            common.settingsStore.set('profiles',profilesarray);
            await renderWindows();
            await renderProfiles();
        } else if (link.classList.contains('win-delete')) {
            console.log("delete",id);
            await removeWindow(id);
        } else if (link.classList.contains('profile-delete')) {
            if (confirm('Delete this profile and all its windows?')) {
                await removeProfile(id).catch(e => alert(`Remove Error...\n\n${e.message}`));
                await renderProfiles();
            }
        } else if (link.classList.contains('profile-clone')) {
            const objWithIdIndex = profilesarray.findIndex((obj) => obj.id === id*1);
            const tocloneprofile = profilesarray[objWithIdIndex];
            const clonedprofile = {
                id: Date.now(),
                name: tocloneprofile.name + "-cloned",
                active: false,
                widgets:  tocloneprofile.widgets      
            };
            profilesarray.push(clonedprofile);
            common.settingsStore.set('profiles',profilesarray);    
            await renderProfiles();
        } else if (link.classList.contains('profile-export')) {
            const objWithIdIndex = profilesarray.findIndex((obj) => obj.id === id*1);
            const data = profilesarray[objWithIdIndex];
            const f = new File([JSON.stringify(data)], `${data.name}.json`, {type: 'application/json'});
            const l = document.createElement('a');
            l.download = f.name;
            l.style.display = 'none';
            l.href = URL.createObjectURL(f);
            try {
                document.body.appendChild(l);
                l.click();
            } finally {
                URL.revokeObjectURL(l.href);
                l.remove();
            }
        }  else if (link.classList.contains('profile-edit-name')) {
            const td = ev.target.closest('td');
            const input = document.createElement('input');
            input.value = td.childNodes[0].textContent;
            input.title = 'Press Enter to save or Escape';
            td.innerHTML = '';
            td.appendChild(input);
            input.focus();
            let actionTaken;
            const save = async () => {
                if (actionTaken) {
                    return;
                }
                actionTaken = true;
                const name = common.sanitize(input.value);
                await renameProfile(id, name);
                await renderProfiles();
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', keyEv => {
                if (keyEv.code === 'Enter') {
                    save();
                } if (keyEv.code === 'Escape') {
                    actionTaken = true;
                    renderProfiles();
                }
            });
        }  
    });

    winsEl.addEventListener('click', async ev => {
        const btn = ev.target.closest('.button[data-action]');
        if (!btn) {
            return;
        }
        if (btn.dataset.action === 'profile-create') {
            await createProfile();
            await renderProfiles();
        } else if (btn.dataset.action === 'profile-import') {
            const fileEl = document.createElement('input');
            fileEl.type = 'file';
            fileEl.accept='.json';
            fileEl.addEventListener('change', async () => {
                fileEl.remove();
                const f = fileEl.files[0];
                if (!f) {
                    return;
                }
                try {
                    const data = JSON.parse(await f.text());
                    await importProfile(data);
                    await renderProfiles();
                    alert(`Successfully Imported: \n\n${data.name}`);
                } catch(e) {
                    alert(`Import Error\n\n${e.message}`);
                    throw e;
                }
            });
            document.body.append(fileEl);
            fileEl.click();
        }
    });

    winsEl.querySelector('.add-new input[type="button"]').addEventListener('click', async ev => {
        ev.preventDefault();
        const type = ev.currentTarget.closest('.add-new').querySelector('select').value;
        const widgetArray = getActiveWidgets();//common.settingsStore.get('widgets');
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
        setActiveWidgets(widgetArray);//common.settingsStore.set('widgets',widgetArray);
        await renderWindows();
        await renderProfiles();
    });
   
}
