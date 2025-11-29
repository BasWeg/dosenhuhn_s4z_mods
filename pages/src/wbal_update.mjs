//const sauce = await import(`/pages/src/../../shared/sauce/index.mjs`);
const common = await import(`/pages/src/common.mjs`);
const page = location.pathname.split('/').at(-1).split('.')[0];
console.log(page);
var queue =[];
var teamid = "";
var icuapi = "";
var zrapi = "";
var icuid = "";
var zwiftid = "";
var type = "";



teamid = common.settingsStore.get('wbal_team_id') || '';
icuapi = common.settingsStore.get('wbal_icu_api') || '';
icuid = common.settingsStore.get('wbal_icu_id') || '';
zwiftid = common.settingsStore.get('wbal_icu_zwiftid') || '';
zrapi = common.settingsStore.get('wbal_zrapi') || '';



document.getElementById("teamNumber").value =  teamid;   
document.getElementById("intervalsAPI").value =  icuapi; 
document.getElementById("intervalsID").value =  icuid; 
document.getElementById("zwiftID").value =  zwiftid; 
document.getElementById("zrAPI").value =  zrapi; 


async function myFunction() {
    await doWbalCPUpdate();
    return;
}

  function generateTable(data) {
    const table = document.querySelector('#content table');
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    let _html='';
    let idx = 0;
    //style="text-align: center; width: 50px;"
    //style="text-align: center; width: 100px;"
    for (const element of data) {
        _html += `<tr><td >${++idx}</td>`
        Object.values(element).forEach(val => {
        _html += `<td >${val}</td>`;
      });
      _html += '</tr>'
    }
    tbody.innerHTML = _html;
  }

async function processFiles(e) {
    type = "wbal_jupdate";
    var file = e.target.files[0];
    let iqueue = [];
    document.getElementById("event_or_team").textContent = "Json:";
    document.getElementById("update_btn").style = "visibility:hidden";
    document.getElementById("demo").innerHTML = "";

    var reader = new FileReader();
    reader.onload = function (e) {

        const json_content = JSON.parse(e.target.result);
        
        try
        {
            for (let rider of json_content){
                iqueue.push({athleteId:rider.athleteId, Wbal:Math.round(rider.wPrime ?? 20000), CP:Math.round(rider.cp ?? 200)});
            }
        }
        catch 
        {
            document.getElementById("fetch_descr").innerHTML = "NO VALID JSON!";
            queue=[];
            const table = document.querySelector('#content table');
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';            
        }

        // output.textContent = JSON.stringify(json_content);
        document.getElementById("fetch_descr").innerHTML = "... loaded";
        document.getElementById("update_btn").style = "visibility:visible";
        queue = iqueue;
        generateTable(queue); // generate the table first      
    };
    reader.readAsText(file);
  }



async function doFetchTeamData(team){
    let iqueue = [];
    document.getElementById("event_or_team").textContent = "Team:";
    document.getElementById("update_btn").style = "visibility:hidden";
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    //let url = `https://zwift-ranking.herokuapp.com/public/clubs/${team}`;
    let url = `https://api.zwiftracing.app/api/public/clubs/${team}`;
    document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";
    let tname = "";
    let myjson = await fetch(url, {
        headers: {
            "Authorization": `${zrapi}`,
        }}).then(response=>response.json());
    // console.log(JSON.stringify(myjson));
    // eslint-disable-next-line no-prototype-builtins
    if (myjson.hasOwnProperty("name")){ 
        // valid data - get teamname from 1st rider
        tname = myjson.name;
        console.log(tname);
        for (let rider of myjson.riders){
            //document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
            iqueue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000), CP:Math.round(rider?.power?.CP ?? 200)});
        }
        document.getElementById("update_btn").style = "visibility:visible";
        document.getElementById("fetch_descr").textContent = tname;
        generateTable(iqueue);
        teamid = team; 
        common.settingsStore.set('wbal_zrapi',zrapi);
    }
    else {
        console.log("Kein Team");
        document.getElementById("fetch_descr").textContent = "NO TEAM FOUND!";
        const table = document.querySelector('#content table');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';        
    } 

    document.getElementById("demo").innerHTML = "... fetching done";
    
    return iqueue;
} 


async function doFetchEventData(event){
    let iqueue = [];
    document.getElementById("event_or_team").textContent = "Event:";
    document.getElementById("update_btn").style = "visibility:hidden";    
    //https://www.zwiftracing.app/api/events/3239317
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    //let url = `https://dosenhuhn.de/get_event_v2.php`;
    let url = `https://dosenhuhn.de/get_event.php`;
    let myeventlist = await fetch(url).then(response=>response.json());
    var index = myeventlist.map(function(o) { return o.eventId; }).indexOf(`${event}`);
    //check if eventid is in myeventlist
    //console.log(index);
    if (index < 0)
    {
        document.getElementById("fetch_descr").textContent = "NO EVENT FOUND!";
        return []; 
    } 
     
    //url = `https://dosenhuhn.de/get_event_v2.php?event=${event}`;
    url = `https://dosenhuhn.de/get_event.php?event=${event}`;
    document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";
    let myjson = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${zrapi}`,
            "Content-Type": "application/json"
        }}).then(response=>response.json());
    // console.log(JSON.stringify(myjson));
    // eslint-disable-next-line no-prototype-builtins
    if (!myjson.hasOwnProperty('message')){ 
        for (let pen of myjson){
            // valid data - get teamname from 1st rider
            //tname = myjson.riders[0].club.name;
            //console.log(tname);
            for (let rider of pen.riders){
                //document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
                iqueue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000), CP:Math.round(rider?.power?.CP ?? 200)});
            }
        } 
        document.getElementById("update_btn").style = "visibility:visible";
        document.getElementById("fetch_descr").textContent = myeventlist[index].title;
        generateTable(iqueue);      
    }
    else {
        console.log("Kein Event");
        document.getElementById("fetch_descr").textContent = "NO EVENT FOUND!";
        const table = document.querySelector('#content table');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';        
    } 

    document.getElementById("demo").innerHTML = "... fetching done";
    
    return iqueue;
} 

async function doFetchIntervalsData(apikey, id, zwiftid){
    let iqueue = [];
    document.getElementById("event_or_team").textContent = "Intervals:";
    document.getElementById("update_btn").style = "visibility:hidden";    


var headers = new Headers({
    'Authorization': `Basic ${btoa("API_KEY:" + apikey)}`
});     
    let url = `https://intervals.icu/api/v1/athlete/${id}/mmp-model?type=Ride`;
    //console.log(url);
    document.getElementById("demo").innerHTML = "Fetching data from intervals.icu...";
    let myjson = await fetch(url,{headers: headers}).then(response=>response.json());
    //console.log(JSON.stringify(myjson));
    if (myjson?.type){ 
    // eslint-disable-next-line no-prototype-builtins
                //document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
        iqueue.push({athleteId:zwiftid, Wbal:Math.round(myjson?.wPrime ?? 20000), CP:Math.round(myjson?.ftp ?? 200)});
        document.getElementById("update_btn").style = "visibility:visible";
        document.getElementById("fetch_descr").textContent = `FTP: ${myjson?.ftp} - WPrime: ${myjson?.wPrime} `;
        generateTable(iqueue);
        common.settingsStore.set('wbal_icu_api',apikey);
        common.settingsStore.set('wbal_icu_id',id); 
        common.settingsStore.set('wbal_icu_zwiftid',zwiftid); 
            
    }
    else {
        console.log("Kein ICU");
        document.getElementById("fetch_descr").textContent = "NO Data FOUND!";
        const table = document.querySelector('#content table');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';        
    } 

    document.getElementById("demo").innerHTML = "... fetching done";
    
    return iqueue;
} 

export async function doWbalCPUpdate(){
    document.getElementById("demo").innerHTML = queue.length + " entries";
    console.log("----- UPDATE -----");
    Promise.all(queue).then(whatevs => {
         //console.log(whatevs);
        for (let athlete of whatevs){
            if (athlete){
               
               let params = [athlete.athleteId,{wPrime:athlete.Wbal, cp:athlete.CP}];
            //    console.log(JSON.stringify(params));
               document.getElementById("demo").innerHTML = "Updating: " + JSON.stringify(params);
               common.rpc.updateAthlete(athlete.athleteId, {wPrime:athlete.Wbal, cp:athlete.CP});
            } else {
                document.getElementById("demo").innerHTML = "API FAILED!"
                console.warn("Failed wbal lookup");
                return;
            }
        }
        document.getElementById("demo").innerHTML = "Updating done";
        document.getElementById("update_btn").style = "visibility:hidden";

        if (type == "wbal_tupdate")
        {
            // store team id
            //console.log('wbal_tupdate ',teamid);
            common.settingsStore.set('wbal_zrapi',zrapi);
            common.settingsStore.set('wbal_team_id',teamid);
        } 

    })
}


export async function main() {
    common.initInteractionListeners();
	document.addEventListener('click', async ev => {
        const btn = ev.target.closest('.button[data-action]');
        if (!btn) {
            return;
        }
        if (btn.dataset.action === 'update') {
            await myFunction();
        } else if (btn.dataset.action ==='fetch-tzr'){
            zrapi = document.getElementById("zrAPI").value;
            type = "wbal_tupdate";
            queue = await doFetchTeamData(document.getElementById("teamNumber").value);
        } else if (btn.dataset.action ==='fetch-ezr'){
            zrapi = document.getElementById("zrAPI").value;
            type = "wbal_eupdate";
            queue = await doFetchEventData(document.getElementById("eventNumber").value);
        }
        else if (btn.dataset.action ==='fetch-icu'){
            type = "wbal_icu";
            icuapi = document.getElementById("intervalsAPI").value;
            icuid = document.getElementById("intervalsID").value;
            zwiftid = +(document.getElementById("zwiftID").value);
            queue = await doFetchIntervalsData(icuapi,icuid,zwiftid);
        }        
    });
    document.getElementById("update_btn").style = "visibility:hidden";

    const inputfile = document.getElementById('fileInput');
    inputfile.addEventListener('change', processFiles);    
}
