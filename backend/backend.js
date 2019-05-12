const config = require('./config')
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: config.gcp.firestore.project,
    keyFilename: config.gcp.firestore.keyfile
});

function compute(currentRecord, data) {
    return new Promise(resolve => {
        currentTemp = parseFloat(currentRecord.temperature)
        currentDate = new Date(currentRecord.date._seconds * 1000);

        if (currentTemp > parseFloat(data.max.temperature)) {
            data.max = currentRecord
        }
        if (currentTemp < parseFloat(data.min.temperature)) {
            data.min = currentRecord
        }
        if (currentDate > parseFloat(data.date.last)) {
            data.date.last = currentDate
        }
        if (currentDate < parseFloat(data.date.first)) {
            data.date.first = currentDate
        }
        data.sum += currentTemp;
        data.count++;

        resolve(data);
    });
};

function display(data, timeFrame) {
    let averageTemp = data.sum / data.count;

    // Create a new JavaScript Date object based on the timestamp multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var maxDate = new Date(data.max.date._seconds * 1000);
    var minDate = new Date(data.min.date._seconds * 1000);
    var firstDate = new Date(data.date.first._seconds * 1000);
    var lastDate = new Date(data.date.last._seconds * 1000);

    console.log('########### ENREGISTREMENTS SUR ' + timeFrame + ' (' + firstDate + ' → ' + lastDate + ') ###########' +
        '\nNombre de températures enregistrées ' + data.count +
        '\nTempérature moyenne ' + averageTemp.toFixed(1) +
        '\nTempérature max ' + parseFloat(data.max.temperature).toFixed(1) + ' le ' + maxDate +
        '\nTempérature minimale ' + parseFloat(data.min.temperature).toFixed(1) + ' le ' + minDate);
}

/**
 * Data sample: Wed May 01 2019 23:59:33 GMT+0100 (British Summer Time) => { humidity: '47.8%', temperature: '20.1*', date: Timestamp { _seconds: 1556751573, _nanoseconds: 749000000 } }
 */
async function analyze() {
    let collectionRef = db.collection(config.gcp.firestore.collection);

    let now = new Date(Date.now()),
        oneMonthAgo = new Date(now),
        oneWeekAgo = new Date(now),
        oneDayAgo = new Date(now),
        halfDayAgo = new Date(now),
        quarterDayAgo = new Date(now),
        oneHourAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    oneWeekAgo.setDate(now.getDay() - 7);
    oneDayAgo.setDate(now.getDay() - 1);
    halfDayAgo.setHours(now.getHours() - 12);
    quarterDayAgo.setHours(now.getHours() - 6);
    oneHourAgo.setHours(now.getHours() - 1);

    let monthly = { date: {threshold: oneMonthAgo, first: new Date(Date.now()), last: new Date(oneMonthAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        weekly = { date: {threshold: oneWeekAgo, first: new Date(Date.now()), last: new Date(oneWeekAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        daily = { date: {threshold: oneDayAgo, first: new Date(Date.now()), last: new Date(oneDayAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        halfDay = { date: {threshold: halfDayAgo, first: new Date(Date.now()), last: new Date(halfDayAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        quarterDay = { date: {threshold: quarterDayAgo, first: new Date(Date.now()), last: new Date(quarterDayAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        hourly = { date: {threshold: oneHourAgo, first: new Date(Date.now()), last: new Date(oneHourAgo)}, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } };

    // Query from most recent to older ones
    collectionRef.where('date', '>', oneMonthAgo).orderBy('date', 'desc').stream().on('data', async(record) => {
        currentRecord = record.data();

        var currentDate = new Date(currentRecord.date._seconds * 1000);
        if (currentDate > monthly.date.threshold) {
            monthly = await compute(currentRecord, monthly);

            if (currentDate > weekly.date.threshold) {
                weekly = await compute(currentRecord, weekly);

                if (currentDate > daily.date.threshold) {
					daily = await compute(currentRecord, daily);

                    if (currentDate > halfDay.date.threshold) {
                        halfDay = await compute(currentRecord, halfDay);

                        if (currentDate > quarterDay.date.threshold) {
                            quarterDay = await compute(currentRecord, quarterDay);

                            if (currentDate > hourly.date.threshold) {
                                monthly = await compute(currentRecord, hourly);
                            }
                        }
                    }
                }
            }
        }
    }).on('end', () => {
        if (typeof monthly.max.date !== 'undefined')
            display(monthly, "UN MOIS");
        if (typeof weekly.max.date !== 'undefined')
            display(weekly, "UNE SEMAINE");
        if (typeof daily.max.date !== 'undefined')
            display(daily, "UN JOUR");
        if (typeof halfDay.max.date !== 'undefined')
            display(halfDay, "12 HEURES");
        if (typeof quarterDay.max.date !== 'undefined')
            display(quarterDay, "SIX HEURES");
        if (typeof hourly.max.date !== 'undefined')
            display(hourly, "UNE HEURE");
    });
}
analyze()