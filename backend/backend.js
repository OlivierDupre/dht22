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

        // console.log("threshold: ", data.date.threshold, ", currentDate: ", currentDate, ", currentTemp: ", currentTemp, ", firstDate: ", data.date.first, ", lastdate: ", data.date.last)

        if (currentTemp > parseFloat(data.max.temperature)) {
            data.max = currentRecord
        }
        if (currentTemp < parseFloat(data.min.temperature)) {
            data.min = currentRecord
        }
        if (currentDate > data.date.last) {
            data.date.last = currentDate
        }
        if (currentDate < data.date.first) {
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

    console.log('########### ENREGISTREMENTS SUR ' + timeFrame + ' (' + data.date.first + ' → ' + data.date.last + ') ###########' +
        '\nNombre de températures enregistrées ' + data.count +
        '\nTempérature moyenne ' + averageTemp.toFixed(1) +
        '\nTempérature max ' + parseFloat(data.max.temperature).toFixed(1) + ' le ' + maxDate +
        '\nTempérature minimale ' + parseFloat(data.min.temperature).toFixed(1) + ' le ' + minDate);
}

/**
 * Data sample: Wed May 01 2019 23:59:33 GMT+0100 (British Summer Time) => { humidity: '47.8%', temperature: '20.1*', date: Timestamp { _seconds: 1556751573, _nanoseconds: 749000000 } }
 */
async function getData(maxAge, dataMap) {
    return new Promise(resolve => {
        let collectionRef = db.collection(config.gcp.firestore.collection);
        let dataCount = 0;

        // Query from most recent to older ones
        collectionRef.where('date', '>', maxAge).orderBy('date', 'desc').stream().on('data', async (record) => {
            currentRecord = record.data();
            currentDate = new Date(currentRecord.date._seconds * 1000);
            dataCount++;

            if (typeof dataMap.get("monthly") !== 'undefined' && currentDate > dataMap.get("monthly").date.threshold) {
                monthly = await compute(currentRecord, dataMap.get("monthly"))
                dataMap.set("monthly", monthly)
            }
            if (typeof dataMap.get("weekly") !== 'undefined' && currentDate > typeof dataMap.get("weekly").date.threshold) {
                weekly = await compute(currentRecord, typeof dataMap.get("weekly"))
                dataMap.set("weekly", weekly)
            }
            if (typeof dataMap.get("daily") !== 'undefined' && currentDate > typeof dataMap.get("daily").date.threshold) {
                daily = await compute(currentRecord, typeof dataMap.get("daily"))
                dataMap.set("daily", daily)
            }
            if (typeof dataMap.get("halfDay") !== 'undefined' && currentDate > typeof dataMap.get("halfDay").date.threshold) {
                halfDay = await compute(currentRecord, typeof dataMap.get("halfDay"))
                dataMap.set("halfDay", halfDay)
            }
            if (typeof dataMap.get("quarterDay") !== 'undefined' && currentDate > typeof dataMap.get("quarterDay").date.threshold) {
                quarterDay = await compute(currentRecord, typeof dataMap.get("quarterDay"))
                dataMap.set("quarterDay", quarterDay)
            }
            if (typeof dataMap.get("hourly") !== 'undefined' && currentDate > typeof dataMap.get("hourly").date.threshold) {
                hourly = await compute(currentRecord, typeof dataMap.get("hourly"))
                dataMap.set("hourly", hourly)
            }
        }).on('end', () => {
            console.log("Data parsed: ", dataCount)
            resolve(dataMap)
        });
    })
}

function displayData(dataMap) {
    console.log("Display data", dataMap)

    if (typeof dataMap.get("monthly") !== 'undefined' && typeof dataMap.get("monthly").max.date !== 'undefined')
        display(dataMap.get("monthly"), "UN MOIS");
    if (typeof dataMap.get("weekly") !== 'undefined' && typeof dataMap.get("weekly").max.date !== 'undefined')
        display(dataMap.get("weekly"), "UNE SEMAINE");
    if (typeof dataMap.get("daily") !== 'undefined' && typeof dataMap.get("daily").max.date !== 'undefined')
        display(dataMap.get("daily"), "UN JOUR");
    if (typeof dataMap.get("halfDay") !== 'undefined' && typeof dataMap.get("halfDay").max.date !== 'undefined')
        display(dataMap.get("halfDay"), "12 HEURES");
    if (typeof dataMap.get("quarterDay") !== 'undefined' && typeof dataMap.get("quarterDay").max.date !== 'undefined')
        display(dataMap.get("quarterDay"), "SIX HEURES");
    if (typeof dataMap.get("hourly") !== 'undefined' && typeof dataMap.get("hourly").max.date !== 'undefined')
        display(dataMap.get("hourly"), "UNE HEURE");
}


async function analyze() {
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

    let monthly = { date: { threshold: oneMonthAgo, first: new Date(Date.now()), last: new Date(oneMonthAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        weekly = { date: { threshold: oneWeekAgo, first: new Date(Date.now()), last: new Date(oneWeekAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        daily = { date: { threshold: oneDayAgo, first: new Date(Date.now()), last: new Date(oneDayAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        halfDay = { date: { threshold: halfDayAgo, first: new Date(Date.now()), last: new Date(halfDayAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        quarterDay = { date: { threshold: quarterDayAgo, first: new Date(Date.now()), last: new Date(quarterDayAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } },
        hourly = { date: { threshold: oneHourAgo, first: new Date(Date.now()), last: new Date(oneHourAgo) }, count: 0, sum: 0, max: { temperature: -Infinity }, min: { temperature: Infinity } };

    var dataMap = new Map()
    dataMap.set("monthly", monthly)
    dataMap.set("weekly", weekly)
    dataMap.set("daily", daily)
    dataMap.set("halfDay", halfDay)
    dataMap.set("quarterDay", quarterDay)
    dataMap.set("hourly", hourly)

    dataMap = await getData(quarterDayAgo, dataMap);
    displayData(dataMap);
}
analyze()