var spawn = require("child_process").spawn;

const config = require('./config')
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
	  projectId: config.gcp.firestore.project,
	  keyFilename: config.gcp.firestore.keyfile
});


function wait(milleseconds) {
	  return new Promise(resolve => setTimeout(resolve, milleseconds))
}

async function temperature(){
	var collectionRef = db.collection(config.gcp.firestore.collection);

	while(true){
		var process = spawn('python',["./AdafruitDHT.py", "22", "4"] ); 
 
		// Takes stdout data from script which executed with arguments and send this data to res object 
		process.stdout.on('data', function(data) { 
       			var temperatureAndHumidity = Buffer.from(data, 'utf8').toString().slice(0, -1);
			var tAndHArray = temperatureAndHumidity.split(" ")
			var temperature = tAndHArray[0].split("=")[1].trim()
			console.log("Temp : ",temperature);
			var humidity = tAndHArray[tAndHArray.length - 1].split("=")[1]
			console.log("Humidity : ",humidity);
		
			var d = new Date();
			console.log("Date: ",d.toString());
		
			var docRef = collectionRef.doc(d.toString());
			var setTemp = docRef.set({
	  			temperature: temperature,
	  			humidity: humidity,
				date: d
			});
			
		}) 

		await wait(config.frequency)
	}
}
temperature()
