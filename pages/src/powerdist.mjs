import * as sauce from '/pages/src/../../shared/sauce/index.mjs';
import * as common from '/pages/src/common.mjs';
//import * as echarts from '/pages/deps/src/echarts.mjs';
const [echarts, theme] = await Promise.all([
    import('/pages/deps/src/echarts.mjs'),
    import('/pages/src//echarts-sauce-theme.mjs'),
]);

const doc = document.documentElement;
const L = sauce.locale;

//const fieldsKey = 'dosenhuhn_powerdist_settings_v1';
let imperial = common.storage.get('/imperialUnits');
L.setImperial(imperial);

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

      grid: {
        left: '4%',
        bottom: '4%',
        right: '4%',
        top: '4%'},
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      min: 0,
      max: 100,
      axisLabel: {
        color: 'white',
        show: false,
        textStyle: {
            fontSize: '15',
          },
      },

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
  
    //let refresh;
    //const setRefresh = () => {
    //    refresh = (common.settingsStore.get('refreshInterval') || 0) * 1000 - 100; // within 100ms is fine.
    //};
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
        //    setRefresh();
        }  

        render();
        
    });

    common.storage.addEventListener('globalupdate', ev => {
        if (ev.data.key === '/imperialUnits') {
            L.setImperial(imperial = ev.data.value);
        } else if (ev.data.key === '/exteranlEventSite') {
         //   eventSite = ev.data.value;
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
    
    //setRefresh();
    let athleteId;
    
    echarts.registerTheme('sauce', theme.getTheme('dynamic'));
    addEventListener('resize', resizeCharts);
    
    const chart = echarts.init(document.getElementById('chart-container'),'sauce', {renderer: 'svg'});
    chartRefs.add(new WeakRef(chart));

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
     
        const timeInZones = watching.stats.power.timeInZones || [];

        chart_options.series = [];
        const sum = timeInZones.reduce((total, item) => total + item.time, 0);
      
        chart_options.series = [];
        chart_options.series = timeInZones.map(x => ({
                data: [Math.round((x.time/sum)*1e4)/1e2],
                name: x.zone,
                stack: 'total',
                type: 'bar',
                barwidth: '100%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {offset: 0, color: colors[x.zone]},
                        {offset: 1, color: colors[x.zone] + '8'},
                    ]),
                },
            })),
          
        chart.setOption(chart_options);
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
