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
            lastRecord = doc.data();
        });
    }).catch((err) => {
        console.log('Error getting documents', err);
    });

    collectionRef.orderBy('date', 'desc').limit(1).get().then((first) => {
        first.forEach((doc) => {
            firstRecord = doc.data();
        });
    }).catch((err) => {
        console.log('Error getting documents', err);
    });

    let count = 0;
    let sumTemp = 0;
    let maxTemp = { temperature: -Infinity };
    let minTemp = { temperature: Infinity };

    // Query from most recent to older ones
    collectionRef.orderBy('date', 'desc').stream().on('data', (record) => {
        console.log('Found document ', record.id);
        currentRecord = record.data()
        currentTemp = parseFloat(currentRecord.temperature)
        if (currentTemp > parseFloat(maxTemp.temperature)) {
            maxTemp = currentRecord
        }
        if (currentTemp < parseFloat(minTemp.temperature)) {
            minTemp = currentRecord
        }
        sumTemp += currentTemp;
        ++count;
    }).on('end', () => {
        let averageTemp = sumTemp / count;

        // Create a new JavaScript Date object based on the timestamp
        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
        var maxDate = new Date(maxTemp.date._seconds * 1000);

        // Create a new JavaScript Date object based on the timestamp
        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
        var minDate = new Date(minTemp.date._seconds * 1000);

        console.log('Number of temperature recorded ' + count +
            '\nAverage temp is ' + averageTemp +
            '\nMax temp is ' + parseFloat(maxTemp.temperature) + ' on ' + maxDate +
            '\nMin temp is ' + parseFloat(minTemp.temperature) + ' on ' + minDate);
    });

    //     Wed May 01 2019 23:59:33 GMT+0100 (British Summer Time) => { humidity: '47.8%',
    //   temperature: '20.1*',
    //   date: Timestamp { _seconds: 1556751573, _nanoseconds: 749000000 } }

    // collectionRef.get().then((snapshot) => {
    //     snapshot.forEach((doc) => {
    //         console.log(doc.id, '=>', doc.data());
    //         console.log(doc.temperature)
    //     });
    // }).catch((err) => {
    //     console.log('Error getting documents', err);
    // });

    // await wait(config.frequency)
    // }
}
temperature()