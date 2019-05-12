const config = require('../config')
const { DateTime } = require("luxon");
const Firestore = require('@google-cloud/firestore');

const express = require('express')
const app = express()
const bodyParser = require('body-parser');

const MONTHLY = "monthly";
const WEEKLY = "weekly";
const DAILY = "daily";
const HALF_DAY = "halfDay";
const QUARTER_DAY = "quarterDay";
const HOURLY = "hourly";

const db = new Firestore({
    projectId: config.gcp.firestore.project,
    keyFilename: config.gcp.firestore.keyfile
});
const router = express.Router();
router.use(bodyParser.json());

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

function format(data, timeFrame) {
    let averageTemp = data.sum / data.count;
    let localDateFormat = { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }

    var maxDate = DateTime.fromMillis(data.max.date._seconds);
    var minDate = DateTime.fromMillis(data.min.date._seconds);
    var firstDate = DateTime.fromJSDate(data.date.first);
    var lastDate = DateTime.fromJSDate(data.date.last);

    return '########### ENREGISTREMENTS SUR ' + timeFrame + ' (' + firstDate.setLocale('fr').toLocaleString(localDateFormat) + ' → ' + lastDate.setLocale('fr').toLocaleString(localDateFormat) + ') ###########' +
        '\nNombre de températures enregistrées ' + data.count +
        '\nTempérature moyenne ' + averageTemp.toFixed(1) +
        '\nTempérature max ' + parseFloat(data.max.temperature).toFixed(1) + ' le ' +
        maxDate.setLocale('fr').toLocaleString(localDateFormat) +
        '\nTempérature minimale ' + parseFloat(data.min.temperature).toFixed(1) + ' le ' +
        minDate.setLocale('fr').toLocaleString(localDateFormat) +
        '\n\n';
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

            if (typeof dataMap.get(MONTHLY) !== 'undefined' && currentDate > dataMap.get(MONTHLY).date.threshold && maxAge <= dataMap.get(MONTHLY).date.threshold) {
                monthly = await compute(currentRecord, dataMap.get(MONTHLY))
                dataMap.set(MONTHLY, monthly)
            }
            if (typeof dataMap.get(WEEKLY) !== 'undefined' && currentDate > dataMap.get(WEEKLY).date.threshold && maxAge <= dataMap.get(WEEKLY).date.threshold) {
                weekly = await compute(currentRecord, dataMap.get(WEEKLY))
                dataMap.set(WEEKLY, weekly)
            }
            if (typeof dataMap.get(DAILY) !== 'undefined' && currentDate > dataMap.get(DAILY).date.threshold && maxAge <= dataMap.get(DAILY).date.threshold) {
                daily = await compute(currentRecord, dataMap.get(DAILY))
                dataMap.set(DAILY, daily)
            }
            if (typeof dataMap.get(HALF_DAY) !== 'undefined' && currentDate > dataMap.get(HALF_DAY).date.threshold && maxAge <= dataMap.get(HALF_DAY).date.threshold) {
                halfDay = await compute(currentRecord, dataMap.get(HALF_DAY))
                dataMap.set(HALF_DAY, halfDay)
            }
            if (typeof dataMap.get(QUARTER_DAY) !== 'undefined' && currentDate > dataMap.get(QUARTER_DAY).date.threshold && maxAge <= dataMap.get(QUARTER_DAY).date.threshold) {
                quarterDay = await compute(currentRecord, dataMap.get(QUARTER_DAY))
                dataMap.set(QUARTER_DAY, quarterDay)
            }
            if (typeof dataMap.get(HOURLY) !== 'undefined' && currentDate > dataMap.get(HOURLY).date.threshold && maxAge <= dataMap.get(HOURLY).date.threshold) {
                hourly = await compute(currentRecord, dataMap.get(HOURLY))
                dataMap.set(HOURLY, hourly)
            }
        }).on('end', () => {
            console.log("Data parsed: ", dataCount)
            resolve(dataMap)
        });
    })
}

function formatData(maxAge, dataMap) {
    return new Promise(resolve => {
        let stringData = ''

        if (typeof dataMap.get(MONTHLY) !== 'undefined' && typeof dataMap.get(MONTHLY).max.date !== 'undefined' && maxAge <= dataMap.get(MONTHLY).date.threshold)
            stringData += format(dataMap.get(MONTHLY), "UN MOIS");
        if (typeof dataMap.get(WEEKLY) !== 'undefined' && typeof dataMap.get(WEEKLY).max.date !== 'undefined' && maxAge <= dataMap.get(WEEKLY).date.threshold)
            stringData += format(dataMap.get(WEEKLY), "UNE SEMAINE");
        if (typeof dataMap.get(DAILY) !== 'undefined' && typeof dataMap.get(DAILY).max.date !== 'undefined' && maxAge <= dataMap.get(DAILY).date.threshold)
            stringData += format(dataMap.get(DAILY), "UN JOUR");
        if (typeof dataMap.get(HALF_DAY) !== 'undefined' && typeof dataMap.get(HALF_DAY).max.date !== 'undefined' && maxAge <= dataMap.get(HALF_DAY).date.threshold)
            stringData += format(dataMap.get(HALF_DAY), "12 HEURES");
        if (typeof dataMap.get(QUARTER_DAY) !== 'undefined' && typeof dataMap.get(QUARTER_DAY).max.date !== 'undefined' && maxAge <= dataMap.get(QUARTER_DAY).date.threshold)
            stringData += format(dataMap.get(QUARTER_DAY), "SIX HEURES");
        if (typeof dataMap.get(HOURLY) !== 'undefined' && typeof dataMap.get(HOURLY).max.date !== 'undefined' && maxAge <= dataMap.get(HOURLY).date.threshold)
            stringData += format(dataMap.get(HOURLY), "UNE HEURE");

        // console.log('String Data: ', stringData)

        resolve(stringData)
    })
}

function analyze(timeFrame) {
    return new Promise(async resolve => {
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
        dataMap.set(MONTHLY, monthly)
        dataMap.set(WEEKLY, weekly)
        dataMap.set(DAILY, daily)
        dataMap.set(HALF_DAY, halfDay)
        dataMap.set(QUARTER_DAY, quarterDay)
        dataMap.set(HOURLY, hourly)

        dataMap = await getData(dataMap.get(timeFrame).date.threshold, dataMap);
        // displayData(dataMap);
        resolve(dataMap)
    })
}

// Handles GET requests to /messages
router.get('/timeframe/:timeframe', async (req, res) => {
    console.log(`Received request: ${req.method} ${req.url}`)

    // Query for messages in descending order
    try {
        if ([MONTHLY, WEEKLY, DAILY, HALF_DAY, QUARTER_DAY, HOURLY].indexOf(req.params.timeframe ) >= 0) {
            dataMap = await analyze(req.params.timeframe)
            stringData = await formatData(dataMap.get(req.params.timeframe).date.threshold, dataMap)
            res.status(200).send(stringData.replace(/\n/g, "<br />"))
        } else {
            res.status(404).send("Route " + req.params.timeframe + " does not exist")
        }
    } catch (error) {
        res.status(500).json(error)
    }
});

module.exports = router;
