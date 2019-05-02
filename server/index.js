const config = require('./config')
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: config.gcp.firestore.project,
    keyFilename: config.gcp.firestore.keyfile
});

// function wait(milleseconds) {
//     return new Promise(resolve => setTimeout(resolve, milleseconds))
// }

function compute(currentRecord, data) {
    return new Promise(resolve => {
        currentTemp = parseFloat(currentRecord.temperature)

        if (currentTemp > parseFloat(data.max.temperature)) {
            data.max = currentRecord
        }
        if (currentTemp < parseFloat(data.min.temperature)) {
            data.min = currentRecord
        }
        data.sum += currentTemp;
        data.count++;

        resolve(data);
    });
};

async function temperature() {
    let collectionRef = db.collection(config.gcp.firestore.collection);
    let firstRecord, lastRecord;

    let now = new Date(Date.now());
    let oneMonthAgo = now,
        oneWeekAgo = now,
        oneDayAgo = now,
        halfDayAgo = now,
        quarterDayAgo = now,
        oneHourAgo = now;
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneWeekAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneDayAgo.setMonth(oneMonthAgo.getMonth() - 1);
    halfDayAgo.setMonth(oneMonthAgo.getMonth() - 1);
    quarterDayAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneHourAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let monthly = { date: oneMonthAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        weekly = { date: oneWeekAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        daily = { date: oneDayAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        halfDay = { date: halfDayAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        quarterDay = { date: quarterDayAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        hourly = { date: oneHourAgo, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } };

    // Query from most recent to older ones
    collectionRef.where('date', '>', oneMonthAgo).orderBy('date', 'desc').stream().on('data', (record) => {
        currentRecord = record.data();
        // firstRecord = currentRecord;

        // if (lastRecord === undefined) {
        //     lastRecord = currentRecord
        // }

        // monthly = await compute(currentRecord, monthly);
        compute(currentRecord, monthly).then(result => { monthly = result });
        // // console.log('Found document ', record.id);
        // currentTemp = parseFloat(currentRecord.temperature)

        // if (currentTemp > parseFloat(maxTemp.temperature)) {
        //     maxTemp = currentRecord
        // }
        // if (currentTemp < parseFloat(minTemp.temperature)) {
        //     minTemp = currentRecord
        // }
        // sumTemp += currentTemp;
        // ++count;
    }).on('end', () => {
        let averageTemp = monthly.sum / monthly.count;

        // Create a new JavaScript Date object based on the timestamp multiplied by 1000 so that the argument is in milliseconds, not seconds.
        var maxDate = new Date(monthly.max.date._seconds * 1000);

        // Create a new JavaScript Date object based on the timestamp multiplied by 1000 so that the argument is in milliseconds, not seconds.
        var minDate = new Date(monthly.min.date._seconds * 1000);

        console.log('Number of temperature recorded ' + monthly.count +
            '\nAverage temp is ' + averageTemp +
            '\nMax temp is ' + parseFloat(monthly.max.temperature) + ' on ' + maxDate +
            '\nMin temp is ' + parseFloat(monthly.min.temperature) + ' on ' + minDate);

        // console.log("First record is ", new Date(firstRecord.date._seconds * 1000));
        // console.log("Last record is ", new Date(lastRecord.date._seconds * 1000));
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