import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';
//import * as echarts from '/pages/deps/src/echarts.mjs';
const [echarts, theme] = await Promise.all([
    import('/pages/deps/src/echarts.mjs'),
    import('/pages/src//echarts-sauce-theme.mjs'),
]);

const doc = document.documentElement;
const L = sauce.locale;
const H = L.human;
const num = H.number;
const fieldsKey = 'dosenhuhn_zam_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);
//let eventSite = common.storage.get('/externalEventSite', 'zwift');
//let fieldStates;
let gameConnection;

const chartRefs = new Set();

let chart_options = {
    animation: false,
    tooltip: {
        trigger: 'axis',
        axisPointer: {
          // Use axis to trigger tooltip
          type: 'shadow' // 'shadow' as default; can also be 'line' or 'shadow'
        }
      },
    //   legend: {
    //     //top: 'bottom',
    //     bottom: -10,
    //     textStyle: {
    //     color: 'white'  // Set the text color to red
    //   }},
  
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      min: 0,
      max: 100,
      axisLabel: {
        color: 'white'  // Set the text color to red
      }
    },
    yAxis: {
      type: 'category',
      data: ['']
    },
    series: []
  };


  

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
const pwr = v => H.power(v, {suffix: true, html: true});
const hr = v => v ? num(v) : '-';
const kj = (v, options) => v != null ? num(v, options) + unit('kJ') : '-';
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




function fmtWkg(v, entry) {
    if (v == null) {
        return '-';
    }
    const wkg = v / (entry.athlete && entry.athlete.weight);
    return (wkg !== Infinity && wkg !== -Infinity && !isNaN(wkg)) ?
        num(wkg, {precision: 1, fixed: true}) + unit('w/kg') :
        '-';
}



/*
const fieldGroups = [{
    group: 'athlete',
    label: 'Athlete',
    fields: [
        {id: 'actions', defaultEn: false, label: 'Action Button(s)', headerLabel: ' ', fmt: fmtActions},
        {id: 'avatar', defaultEn: true, label: 'Avatar', headerLabel: '<ms>account_circle</ms>',
         get: x => x.athlete && x.athlete.sanitizedFullname, fmt: fmtAvatar},
        {id: 'nation', defaultEn: true, label: 'Country Flag', headerLabel: '<ms>flag</ms>',
         get: x => x.athlete && x.athlete.countryCode, fmt: common.fmtFlag},
        {id: 'name', defaultEn: true, label: 'Name', get: x => x.athlete && x.athlete.sanitizedFullname,
         fmt: fmtName},
        {id: 'f-last', defaultEn: false, label: 'F. Last', get: x => x.athlete && x.athlete.fLast,
         fmt: fmtName},
        {id: 'initials', defaultEn: false, label: 'Name Initials', headerLabel: ' ',
         get: x => x.athlete && x.athlete.initials, fmt: fmtName},
        {id: 'team', defaultEn: false, label: 'Team', get: x => x.athlete && x.athlete.team,
         fmt: common.teamBadge},
        {id: 'weight-class', defaultEn: false, label: 'Weight Class', headerLabel: 'Weight',
         get: x => x.athlete && x.athlete.weight, fmt: weightClass},
        {id: 'level', defaultEn: false, label: 'Level', get: x => x.athlete && x.athlete.level,
         tooltip: 'The Zwift level of this athlete'},
        {id: 'ftp', defaultEn: false, label: 'FTP', get: x => x.athlete && x.athlete.ftp,
         fmt: x => x ? pwr(x) : '-', tooltip: 'Functional Threshold Power'},
        {id: 'cp', defaultEn: false, label: 'CP', get: x => x.athlete && x.athlete.cp,
         fmt: x => x ? pwr(x) : '-', tooltip: 'Critical Power'},
        {id: 'tss', defaultEn: false, label: 'TSS', get: x => x.stats.power.tss, fmt: num,
         tooltip: 'Training Stress Score'},
        {id: 'intensity-factor', defaultEn: false, label: 'Intensity Factor', headerLabel: 'IF',
         tootltip: 'Normalized Power / FTP: A value of 100% means NP = FTP', get: x => x.stats.power.np,
         fmt: (x, entry) => pct(x / (entry.athlete && entry.athlete.ftp) * 100)},
        {id: 'distance', defaultEn: false, label: 'Distance', headerLabel: 'Dist',
         get: x => x.state.distance, fmt: fmtDist},
        {id: 'event-distance', defaultEn: false, label: 'Event Distance', headerLabel: 'Ev Dist',
         get: x => x.state.eventDistance, fmt: fmtDist},
        {id: 'rideons', defaultEn: false, label: 'Ride Ons', headerLabel: '<ms>thumb_up</ms>',
         get: x => x.state.rideons, fmt: num},
        {id: 'kj', defaultEn: false, label: 'Energy (kJ)', headerLabel: 'kJ', get: x => x.state.kj, fmt: kj},
        {id: 'wprimebal', defaultEn: false, label: 'W\'bal', get: x => x.stats.power.wBal,
         tooltip: "W' and W'bal represent time above threshold and remaining energy respectively.\n" +
         "Think of the W'bal value as the amount of energy in a battery.",
         fmt: (x, entry) => (x != null && entry.athlete && entry.athlete.wPrime) ?
            common.fmtBattery(x / entry.athlete.wPrime) + kj(x / 1000, {precision: 1}) : '-'},
        {id: 'power-meter', defaultEn: false, label: 'Power Meter', headerLabel: 'PM',
         get: x => x.state.powerMeter, fmt: x => x ? '<ms>check</ms>' : ''},
    ],
}, {
    group: 'event',
    label: 'Event / Road',
    fields: [
        {id: 'gap', defaultEn: true, label: 'Gap', get: x => x.gap, fmt: gapTime},
        {id: 'gap-distance', defaultEn: false, label: 'Gap (dist)', get: x => x.gapDistance, fmt: fmtDist},
        {id: 'game-laps', defaultEn: false, label: 'Game Lap', headerLabel: 'Lap',
         get: x => x.state.laps, fmt: x => x != null ? x + 1 : '-'},
        {id: 'remaining', defaultEn: false, label: 'Event/Route Remaining', headerLabel: '<ms>sports_score</ms>',
         get: x => x.remaining, fmt: (v, entry) => entry.remainingMetric === 'distance' ? fmtDist(v) : fmtDur(v)},
        {id: 'position', defaultEn: false, label: 'Event Position', headerLabel: 'Pos',
         get: x => x.eventPosition, fmt: H.number},
        {id: 'event', defaultEn: false, label: 'Event', headerLabel: '<ms>event</ms>',
         get: x => x.state.eventSubgroupId, fmt: fmtEvent},
        {id: 'route', defaultEn: false, label: 'Route', headerLabel: '<ms>route</ms>',
         get: getRoute, fmt: fmtRoute},
        {id: 'progress', defaultEn: false, label: 'Route %', headerLabel: 'RT %',
         get: x => x.state.progress * 100, fmt: pct},
        {id: 'workout-zone', defaultEn: false, label: 'Workout Zone', headerLabel: 'Zone',
         get: x => x.state.workoutZone, fmt: x => x || '-'},
        {id: 'road', defaultEn: false, label: 'Road ID', get: x => x.state.roadId},
        {id: 'roadcom', defaultEn: false, label: 'Road Completion', headerLabel: 'Road %',
         get: x => x.state.roadCompletion / 10000, fmt: pct},
    ],
}, {
    group: 'power',
    label: 'Power',
    fields: [
        {id: 'pwr-cur', defaultEn: true, label: 'Current Power', headerLabel: 'Pwr',
         get: x => x.state.power, fmt: pwr},
        {id: 'wkg-cur', defaultEn: true, label: 'Current Watts/kg', headerLabel: 'W/kg',
         get: x => x.state.power, fmt: fmtWkg},
        {id: 'pwr-5s', defaultEn: false, label: '5s average', headerLabel: 'Pwr (5s)',
         get: x => x.stats.power.smooth[5], fmt: pwr},
        {id: 'wkg-5s', defaultEn: false, label: '5s average (w/kg)', headerLabel: 'W/kg (5s)',
         get: x => x.stats.power.smooth[5], fmt: fmtWkg},
        {id: 'pwr-15s', defaultEn: false, label: '15 sec average', headerLabel: 'Pwr (15s)',
         get: x => x.stats.power.smooth[15], fmt: pwr},
        {id: 'wkg-15s', defaultEn: false, label: '15 sec average (w/kg)', headerLabel: 'W/kg (15s)',
         get: x => x.stats.power.smooth[15], fmt: fmtWkg},
        {id: 'pwr-60s', defaultEn: false, label: '1 min average', headerLabel: 'Pwr (1m)',
         get: x => x.stats.power.smooth[60], fmt: pwr},
        {id: 'wkg-60s', defaultEn: false, label: '1 min average (w/kg', headerLabel: 'W/kg (1m)',
         get: x => x.stats.power.smooth[60], fmt: fmtWkg},
        {id: 'pwr-300s', defaultEn: false, label: '5 min average', headerLabel: 'Pwr (5m)',
         get: x => x.stats.power.smooth[300], fmt: pwr},
        {id: 'wkg-300s', defaultEn: false, label: '5 min average (w/kg)', headerLabel: 'W/kg (5m)',
         get: x => x.stats.power.smooth[300], fmt: fmtWkg},
        {id: 'pwr-1200s', defaultEn: false, label: '20 min average', headerLabel: 'Pwr (20m)',
         get: x => x.stats.power.smooth[1200], fmt: pwr},
        {id: 'wkg-1200s', defaultEn: false, label: '20 min average (w/kg)', headerLabel: 'W/kg (20m)',
         get: x => x.stats.power.smooth[1200], fmt: fmtWkg},
        {id: 'pwr-avg', defaultEn: true, label: 'Total Average', headerLabel: 'Pwr (avg)',
         get: x => x.stats.power.avg, fmt: pwr},
        {id: 'wkg-avg', defaultEn: false, label: 'Total W/kg Average', headerLabel: 'W/kg (avg)',
         get: x => x.stats.power.avg, fmt: fmtWkg},
        {id: 'pwr-np', defaultEn: true, label: 'NP', headerLabel: 'NP',
         get: x => x.stats.power.np, fmt: pwr},
        {id: 'wkg-np', defaultEn: false, label: 'NP (w/kg)', headerLabel: 'NP (w/kg)',
         get: x => x.stats.power.np, fmt: fmtWkg},
        {id: 'pwr-vi', defaultEn: true, label: 'Variability Index', headerLabel: 'VI',
         get: x => x.stats.power.np / x.stats.power.avg, tooltip: 'NP / Avg-Power',
         fmt: x => num(x, {precision: 2, fixed: true})},
        {id: 'power-lap', defaultEn: false, label: 'Lap Average', headerLabel: 'Pwr (lap)',
         get: x => x.laps.at(-1).power.avg, fmt: pwr},
        {id: 'wkg-lap', defaultEn: false, label: 'Lap W/kg Average', headerLabel: 'W/kg (lap)',
         get: x => x.laps.at(-1).power.avg, fmt: fmtWkg},
        {id: 'power-last-lap', defaultEn: false, label: 'Last Lap Average', headerLabel: 'Pwr (last)',
         get: x => x.laps.at(-2).power.avg, fmt: pwr},
        {id: 'wkg-last-lap', defaultEn: false, label: 'Last Lap W/kg Average', headerLabel: 'W/kg (last)',
         get: x => x.laps.at(-2).power.avg, fmt: fmtWkg},
    ],
}, {
    group: 'speed',
    label: 'Speed',
    fields: [
        {id: 'spd-cur', defaultEn: true, label: 'Current Speed', headerLabel: 'Spd',
         get: x => x.state.speed, fmt: spd},
        {id: 'spd-60s', defaultEn: false, label: '1 min average', headerLabel: 'Spd (1m)',
         get: x => x.stats.speed.smooth[60], fmt: spd},
        {id: 'spd-300s', defaultEn: false, label: '5 min average', headerLabel: 'Spd (5m)',
         get: x => x.stats.speed.smooth[300], fmt: spd},
        {id: 'spd-1200s', defaultEn: false, label: '20 min average', headerLabel: 'Spd (20m)',
         get: x => x.stats.speed.smooth[1200], fmt: spd},
        {id: 'spd-avg', defaultEn: true, label: 'Total Average', headerLabel: 'Spd (avg)',
         get: x => x.stats.speed.avg, fmt: spd},
        {id: 'speed-lap', defaultEn: false, label: 'Lap Average', headerLabel: 'Spd (lap)',
         get: x => x.laps.at(-1).speed.avg, fmt: spd},
        {id: 'speed-last-lap', defaultEn: false, label: 'Last Lap Average', headerLabel: 'Spd (last)',
         get: x => x.laps.at(-2).speed.avg, fmt: spd},
    ],
}, {
    group: 'hr',
    label: 'Heart Rate',
    fields: [
        {id: 'hr-cur', defaultEn: true, label: 'Current Heart Rate', headerLabel: 'HR',
         get: x => x.state.heartrate || null, fmt: hr},
        {id: 'hr-60s', defaultEn: false, label: '1 min average', headerLabel: 'HR (1m)',
         get: x => x.stats.hr.smooth[60], fmt: hr},
        {id: 'hr-300s', defaultEn: false, label: '5 min average', headerLabel: 'HR (5m)',
         get: x => x.stats.hr.smooth[300], fmt: hr},
        {id: 'hr-1200s', defaultEn: false, label: '20 min average', headerLabel: 'HR (20m)',
         get: x => x.stats.hr.smooth[1200], fmt: hr},
        {id: 'hr-avg', defaultEn: true, label: 'Total Average', headerLabel: 'HR (avg)',
         get: x => x.stats.hr.avg, fmt: hr},
        {id: 'hr-lap', defaultEn: false, label: 'Lap Average', headerLabel: 'HR (lap)',
         get: x => x.laps.at(-1).hr.avg, fmt: hr},
        {id: 'hr-last-lap', defaultEn: false, label: 'Last Lap Average', headerLabel: 'HR (last)',
         get: x => x.laps.at(-2).hr.avg, fmt: hr},
    ],
}, {
    group: 'draft',
    label: 'Draft',
    fields: [
        {id: 'draft', defaultEn: false, label: 'Current Draft', headerLabel: 'Draft',
         get: x => x.state.draft, fmt: pct},
        {id: 'draft-60s', defaultEn: false, label: '1 min average', headerLabel: 'Draft (1m)',
         get: x => x.stats.draft.smooth[60], fmt: pct},
        {id: 'draft-300s', defaultEn: false, label: '5 min average', headerLabel: 'Draft (5m)',
         get: x => x.stats.draft.smooth[300], fmt: pct},
        {id: 'draft-1200s', defaultEn: false, label: '20 min average', headerLabel: 'Draft (20m)',
         get: x => x.stats.draft.smooth[1200], fmt: pct},
        {id: 'draft-avg', defaultEn: false, label: 'Total Average', headerLabel: 'Draft (avg)',
         get: x => x.stats.draft.avg, fmt: pct},
        {id: 'draft-lap', defaultEn: false, label: 'Lap Average', headerLabel: 'Draft (lap)',
         get: x => x.laps.at(-1).draft.avg, fmt: pct},
        {id: 'draft-last-lap', defaultEn: false, label: 'Last Lap Average', headerLabel: 'Draft (last)',
         get: x => x.laps.at(-2).draft.avg, fmt: pct},
    ],

}, {
    group: 'peaks',
    label: 'Peak Performances',
    fields: [
        {id: 'pwr-max', defaultEn: true, label: 'Power Max', headerLabel: 'Pwr (max)',
         get: x => x.stats.power.max || null, fmt: pwr},
        {id: 'wkg-max', defaultEn: false, label: 'Watts/kg Max', headerLabel: 'W/kg (max)',
         get: x => x.stats.power.max || null, fmt: fmtWkg},
        {id: 'pwr-p5s', defaultEn: false, label: 'Power 5 sec peak', headerLabel: 'Pwr (peak 5s)',
         get: x => x.stats.power.peaks[5].avg, fmt: pwr},
        {id: 'wkg-p5s', defaultEn: false, label: 'Watts/kg 5 sec peak', headerLabel: 'W/kg (peak 5s)',
         get: x => x.stats.power.peaks[5].avg, fmt: fmtWkg},
        {id: 'pwr-p15s', defaultEn: false, label: 'Power 15 sec peak', headerLabel: 'Pwr (peak 15s)',
         get: x => x.stats.power.peaks[15].avg, fmt: pwr},
        {id: 'wkg-p15s', defaultEn: false, label: 'Watts/kg 15 sec peak', headerLabel: 'W/kg (peak 15s)',
         get: x => x.stats.power.peaks[15].avg, fmt: fmtWkg},
        {id: 'pwr-p60s', defaultEn: false, label: 'Power 1 min peak', headerLabel: 'Pwr (peak 1m)',
         get: x => x.stats.power.peaks[60].avg, fmt: pwr},
        {id: 'wkg-p60s', defaultEn: false, label: 'Watts/kg 1 min peak', headerLabel: 'W/kg (peak 1m)',
         get: x => x.stats.power.peaks[60].avg, fmt: fmtWkg},
        {id: 'pwr-p300s', defaultEn: true, label: 'Power 5 min peak', headerLabel: 'Pwr (peak 5m)',
         get: x => x.stats.power.peaks[300].avg, fmt: pwr},
        {id: 'wkg-p300s', defaultEn: false, label: 'Watts/kg 5 min peak', headerLabel: 'W/kg (peak 5m)',
         get: x => x.stats.power.peaks[300].avg, fmt: fmtWkg},
        {id: 'pwr-p1200s', defaultEn: false, label: 'Power 20 min peak', headerLabel: 'Pwr (peak 20m)',
         get: x => x.stats.power.peaks[1200].avg, fmt: pwr},
        {id: 'wkg-p1200s', defaultEn: false, label: 'Watts/kg 20 min peak', headerLabel: 'W/kg (peak 20m)',
         get: x => x.stats.power.peaks[1200].avg, fmt: fmtWkg},
        {id: 'spd-p60s', defaultEn: false, label: 'Speed 1 min peak', headerLabel: 'Spd (peak 1m)',
         get: x => x.stats.speed.peaks[60].avg, fmt: spd},
        {id: 'hr-p60s', defaultEn: false, label: 'Heart Rate 1 min peak', headerLabel: 'HR (peak 1m)',
         get: x => x.stats.hr.peaks[60].avg, fmt: hr},
    ],
}, {
    group: 'debug',
    label: 'Debug',
    fields: [
        //{id: 'index', defaultEn: false, label: 'Data Index', headerLabel: 'Idx', get: x => x.index},
        {id: 'id', defaultEn: false, label: 'Athlete ID', headerLabel: 'ID', get: x => x.athleteId},
        {id: 'course', defaultEn: false, label: 'Course (aka world)', headerLabel: '<ms>map</ms>',
         get: x => x.state.courseId},
        {id: 'direction', defaultEn: false, label: 'Direction', headerLabel: 'Dir',
         get: x => x.state.reverse, fmt: x => x ? '<ms>arrow_back</ms>' : '<ms>arrow_forward</ms>'},
        {id: 'latency', defaultEn: false, label: 'Latency',
         get: x => x.state.latency, fmt: x => H.number(x, {suffix: 'ms', html: true})},
        {id: 'power-up', defaultEn: false, label: 'Active Power Up', headerLabel: 'PU',
         get: x => x.state.activePowerUp, fmt: x => x ? x.toLowerCase() : ''},
        {id: 'event-leader', defaultEn: false, label: 'Event Leader', headerLabel: '<ms>star</ms>',
         get: x => x.eventLeader, fmt: x => x ? '<ms style="color: gold">star</ms>' : ''},
        {id: 'event-sweeper', defaultEn: false, label: 'Event Sweeper', headerLabel: '<ms>mop</ms>',
         get: x => x.eventSweeper, fmt: x => x ? '<ms style="color: darkred">mop</ms>' : ''},
    ],
}];
*/

function resizeCharts() {
    for (const r of chartRefs) {
        const c = r.deref();
        if (!c) {
            chartRefs.delete(r);
        } else {
            c.resize();
        }
    }
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
    
    echarts.registerTheme('sauce', theme.getTheme('dynamic'));
    addEventListener('resize', resizeCharts);
    
    const chart = echarts.init(document.getElementById('chart-container'),'sauce', {renderer: 'svg'});
    chartRefs.add(new WeakRef(chart));

    let colors;
    let powerZones;
    let distance = null;
    let altitude = null;
    let incline = 0;
    let incline_avg = 0;
    const incline_array = [0,0,0,0];

    common.subscribe('athlete/watching', watching => {
        if (watching.athleteId !== athleteId) {
            athleteId = watching.athleteId;
            distance = null;
            altitude = null;
            colors = null;
            powerZones = null;
            //console.log(watching);
            common.rpc.getPowerZones(1).then(zones =>{ powerZones = zones; colors = common.getPowerZoneColors(powerZones)});
            //console.log(powerZones);
            //colors = common.getPowerZoneColors(powerZones);
        }
        if (!colors) {
            return;
        }
      //  console.log(colors);
      //  console.log(powerZones);
      //  sport = watching.state.sport || 'cycling';
        //console.log(watching);
        const altitude_new = (watching.state.altitude - 9000) / 2;
        if (!distance || ! altitude)
        {
            distance = watching.state.distance;
            altitude = altitude_new;
        }
        else
        {
            incline = ((altitude_new - altitude) / (watching.state.distance - distance));
            distance = watching.state.distance;
            altitude = altitude_new;      
        }
        incline_array.push(incline);
        if (incline_array.length > 4)
        {
            incline_array.shift();
        }
        incline_avg = Math.round(incline_array.reduce((total, current) => total + current) / incline_array.length);
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

        document.getElementById('act_speed').innerHTML = spd(watching.state.speed,watching);
        document.getElementById('act_pwr').innerHTML = (incline_avg > 4) ? fmtWkg(watching.state.power,watching) : pwr(watching.state.power);
        document.getElementById('act_np').innerHTML = pwr(watching.stats.power.np);        
        document.getElementById('act_wbal').innerHTML = wbal(watching.stats.power.wBal,watching); 
        document.getElementById('act_hr').innerHTML = hr(watching.state.heartrate);   
        const timeInZones = watching.stats.power.timeInZones || [];

        chart_options.series = [];
        const sum = timeInZones.reduce((total, item) => total + item.time, 0);
        // for (let i = 0; i < timeInZones.length; i++) {
        //     // Get the name and data values for the current series
        //     let name = timeInZones[i].zone;
        //     let data = timeInZones[i].time;
        //     // Add the name and data values to the chart options
        //     //chart_options.yAxis.data.push(name);
        //     chart_options.series.push({
        //     name: name,
        //     stack: 'total',
        //     type: 'bar',
        //     data: [Math.round((data/sum)*1e4)/1e2],
        //     });
        // }
        // console.log(chart_options);
        chart_options.series = [];
        chart_options.series = timeInZones.map(x => ({
                data: [Math.round((x.time/sum)*1e4)/1e2],
                name: x.zone,
                stack: 'total',
                 type: 'bar',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {offset: 0, color: colors[x.zone]},
                        {offset: 1, color: colors[x.zone] + '8'},
                    ]),
                },
            })),
          
        // console.log(chart_options);
        // console.log(colors);
        chart.setOption(chart_options);

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
