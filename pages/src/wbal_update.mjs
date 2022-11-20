var mypath = '../../../../pages';

const sauce = await import(`${mypath}/src/../../shared/sauce/index.mjs`);
const common = await import(`${mypath}/src/common.mjs`);

async function myFunction() {
    const team = document.getElementById("myNumber").value;
    doWbalTeamScrape(team);
}


export async function doWbalTeamScrape(team){
    let queue = [];
//    let url = `https://www.zwiftracing.app/api/riders?club=${team}&page=0&pageSize=1000`;
    let url = `https://www.dosenhuhn.de/get_team.php?club=${team}`;
    document.getElementById("demo").innerHTML = "Fetching data from zwiftracing...";

    let myjson = await fetch(url).then(response=>response.json());
    for (let rider of myjson.riders){
        document.getElementById("demo").innerHTML = "Fetching: " + rider?.riderId + " - " + rider?.name + " - WBAL:" + Math.round(rider?.power?.AWC ?? 20000);
        queue.push({athleteId:rider?.riderId, Wbal:Math.round(rider?.power?.AWC ?? 20000)});
    }
    
    document.getElementById("demo").innerHTML = queue.length + " team entries";
    
    Promise.all(queue).then(whatevs => {
        console.log(whatevs);
        for (let athlete of whatevs){
            if (athlete){
               let params = [athlete.athleteId,{wPrime:athlete.Wbal}];
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
        }
    });
}
