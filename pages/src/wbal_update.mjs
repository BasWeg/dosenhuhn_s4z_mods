var mypath = '../../../../pages';

const sauce = await import(`${mypath}/src/../../shared/sauce/index.mjs`);
const common = await import(`${mypath}/src/common.mjs`);
var queue =[];

async function myFunction() {
    //const team = document.getElementById("myNumber").value;
    await doWbalTeamScrape();
    return;
}

async function myRefresh(){
    const team = document.getElementById("myNumber").value;
    queue = await doFetchTeamData(team);
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
            iqueue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000)});
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
    document.getElementById("demo").innerHTML = queue.length + " team entries";
    console.log("----- UPDATE -----");
    Promise.all(queue).then(whatevs => {
        console.log(whatevs);
        for (let athlete of whatevs){
            if (athlete){
               
               let params = [athlete.athleteId,{wPrime:athlete.Wbal}];
               console.log(JSON.stringify(params));
               document.getElementById("demo").innerHTML = "Updating: " + JSON.stringify(params);
               common.rpc.updateAthlete(athlete.athleteId, {wPrime:athlete.Wbal});
            } else {
                document.getElementById("demo").innerHTML = "API FAILED!"
                console.log("Failed wbal lookup");
                return;
            }
        }
        document.getElementById("demo").innerHTML = "Updating done";
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
