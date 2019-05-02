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

	// while (true) {
	collectionRef.get().then((snapshot) => {
		snapshot.forEach((doc) => {
			console.log(doc.id, '=>', doc.data());
		});
	}).catch((err) => {
		console.log('Error getting documents', err);
	});

	await wait(config.frequency)
	// }
}
temperature()
