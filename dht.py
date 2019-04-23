import json
import time
from google.cloud import firestore
from datetime import datetime
import Adafruit_DHT

with open('config.json', 'r') as f:
    config = json.load(f)

frequency = config["frequency"] / 1000

# Project ID is determined by the GCLOUD_PROJECT environment variable
db = firestore.Client()

while True:
    humidity, temperature = Adafruit_DHT.read_retry(22, 4)
    now = datetime.now()
    timestamp = ''+now.isoformat()

    print 'Temp ',temperature,' humidity ',humidity

    doc_ref = db.collection(config["gcp"]["firestore"]["collection"]+'python').document(timestamp)
    doc_ref.set({
        u'temperature': temperature,
        u'humidity': humidity,
        u'date': u''+timestamp
    })

    time.sleep(frequency)

