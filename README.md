# Custom Raspberry Pi DHT 22 logger
## Emitter
1. Copy the `pi` folder to the Raspberry PI
2. ssh to the `pi`
3. Copy local `config.template` to PI named `config.json`
4. Update values
5. Run `pip install --upgrade google-cloud-firestore`

# Source
Freely inspired by https://github.com/adafruit/Adafruit_Python_DHT

## GCP Server
1. Starts the K8S cluster
```
gcloud beta container --project "${PROJECT_ID}" clusters create "dht-cluster" --zone "us-central1-a" --no-enable-basic-auth --cluster-version "1.12.7-gke.10" --machine-type "f1-micro" --image-type "COS" --disk-type "pd-standard" --disk-size "10" --node-labels project=dht --metadata disable-legacy-endpoints=true --scopes "https://www.googleapis.com/auth/cloud-platform" --num-nodes "3" --enable-stackdriver-kubernetes --enable-ip-alias --network "projects/${PROJECT_ID}/global/networks/default" --subnetwork "projects/${PROJECT_ID}/regions/us-central1/subnetworks/default" --default-max-pods-per-node "110" --addons HorizontalPodAutoscaling,HttpLoadBalancing,Istio --istio-config auth=MTLS_PERMISSIVE --enable-autoupgrade --enable-autorepair --labels project=dht
```
2. Create the SA
```
gcloud config set project ${PROJECT_ID}
gcloud iam service-accounts create sa-dht
```
3. Grant access to the SA
`gcloud projects add-iam-policy-binding ${PROJECT_ID} --member "serviceAccount:sa-dht@${PROJECT_ID}.iam.gserviceaccount.com" --role "roles/owner"`