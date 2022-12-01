var mypath = '../../../../pages';

const sauce = await import(`${mypath}/src/../../shared/sauce/index.mjs`);
const common = await import(`${mypath}/src/common.mjs`);
const page = location.pathname.split('/').at(-1).split('.')[0];
console.log(page);
var queue =[];

async function myFunction() {
    //const team = document.getElementById("myNumber").value;
    await doWbalTeamScrape();
    return;
}

async function myRefresh(){
    const team = document.getElementById("myNumber").value;
    if (page == "wbal_tupdate")
   {
    queue = await doFetchTeamData(team);
   } else {
    queue = await doFetchEventData(team);
   } 
    
    return;
} 


async function doFetchTeamData(team){
    let iqueue = [];
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    let url = `https://www.dosenhuhn.de/get_team.php?club=${team}`;
    document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";
    let tname = "";
    let myjson = await fetch(url).then(response=>response.json());
    console.log(JSON.stringify(myjson));
    if (myjson.totalResults > 0){ 
        // valid data - get teamname from 1st rider
        tname = myjson.riders[0].club.name;
        console.log(tname);
        for (let rider of myjson.riders){
            //document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
            iqueue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000), CP:Math.round(rider?.power?.CP ?? 200)});
        }
        document.getElementById("update_btn").style = "visibility:visible";
        document.getElementById("zwiftracing_team").textContent = tname;        
    }
    else {
        console.log("Kein Team");
        document.getElementById("update_btn").style = "visibility:hidden";
        document.getElementById("zwiftracing_team").textContent = "NO TEAM FOUND!";
    } 

    document.getElementById("demo").innerHTML = "... fetching done";
    
    return iqueue;
} 


async function doFetchEventData(event){
    let iqueue = [];
    //https://www.zwiftracing.app/api/events/3239317
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    let url = `https://dosenhuhn.de/get_event.php`;
    let myeventlist = await fetch(url).then(response=>response.json());
    var index = myeventlist.map(function(o) { return o.eventId; }).indexOf(`${event}`);
    //check if eventid is in myeventlist
    console.log(index);
    if (index < 0)
    {
        document.getElementById("zwiftracing_event").textContent = "NO EVENT FOUND!";
        return []; 
    } 
     
    url = `https://dosenhuhn.de/get_event.php?event=${event}`;
    document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";
    let tname = "";
    let myjson = await fetch(url).then(response=>response.json());
    console.log(JSON.stringify(myjson));
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
        document.getElementById("zwiftracing_event").textContent = myeventlist[index].title;        
    }
    else {
        console.log("Kein Event");
        document.getElementById("update_btn").style = "visibility:hidden";
        document.getElementById("zwiftracing_event").textContent = "NO EVENT FOUND!";
    } 

    document.getElementById("demo").innerHTML = "... fetching done";
    
    return iqueue;
} 


export async function doWbalTeamScrape(){
    //let queue = [];
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    // let url = `https://www.dosenhuhn.de/get_team.php?club=${team}`;
    // document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";

    // let myjson = await fetch(url).then(response=>response.json());
    // for (let rider of myjson.riders){
    //     document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
    //     queue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000)});
    // }
    //console.log(JSON.stringify(queue));
    document.getElementById("demo").innerHTML = queue.length + " entries";
    console.log("----- UPDATE -----");
    Promise.all(queue).then(whatevs => {
        console.log(whatevs);
        for (let athlete of whatevs){
            if (athlete){
               
               let params = [athlete.athleteId,{wPrime:athlete.Wbal, ftp:athlete.CP}];
               console.log(JSON.stringify(params));
               document.getElementById("demo").innerHTML = "Updating: " + JSON.stringify(params);
               common.rpc.updateAthlete(athlete.athleteId, {wPrime:athlete.Wbal, ftp:athlete.CP,  CP:athlete.CP});
            } else {
                document.getElementById("demo").innerHTML = "API FAILED!"
                console.log("Failed wbal lookup");
                return;
            }
        }
        document.getElementById("demo").innerHTML = "Updating done";
        document.getElementById("update_btn").style = "visibility:hidden";
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
        } else if (btn.dataset.action ==='fetch-zr'){
            await myRefresh();
        } 
    });
    document.getElementById("update_btn").style = "visibility:hidden";
}
