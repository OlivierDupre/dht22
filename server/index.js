const config = require('./config')
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
	projectId: config.gcp.firestore.project,
	keyFilename: config.gcp.firestore.keyfile
});


function wait(milleseconds) {
	return new Promise(resolve => setTimeout(resolve, milleseconds))
}

async function temperature() {
	var collectionRef = db.collection(config.gcp.firestore.collection);
	var firstRecord, lastRecord;

	// while (true) {
	collectionRef.orderBy('date').limit(1).get().then((last) => {
		last.forEach((doc) => {
			lastRecord=doc.data();
		});
	}).catch((err) => {
		console.log('Error getting documents', err);
	});
	
	collectionRef.orderBy('date','desc').limit(1).get().then((first) => {
		first.forEach((doc) => {
			firstRecord=doc.data();
		});
	}).catch((err) => {
		console.log('Error getting documents', err);
	});

	let count = 0;
	let sumTemp = 0;
	let maxTemp = 0;
	let minTemp = Infinity;

	collectionRef.stream().on('data', (record) => {
	//   console.log(`Found document with name '${record.id}'`);
		sumTemp+=parseFloat(record.data().temperature);
	  	++count;
	}).on('end', () => {
		let moyTemp = sumTemp/count;
	  	console.log(`Total count is ${count}; Temp moy is ${moyTemp}` );
	});


	// collectionRef.get().then((snapshot) => {
		// snapshot.forEach((doc) => {
		// 	console.log(doc.id, '=>', doc.data());
			// console.log(doc.temperature)
		// });
	// }).catch((err) => {
	// 	console.log('Error getting documents', err);
	// });

	// await wait(config.frequency)
	// }
}
temperature()
