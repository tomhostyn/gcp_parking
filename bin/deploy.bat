# 
# GCP cloud function deploy script
#

gcloud beta functions deploy findParking --stage-bucket tom_hostyn_parking_staging --trigger-http
gcloud beta functions logs read
