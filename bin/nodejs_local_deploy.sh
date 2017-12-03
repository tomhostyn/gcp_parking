# local install setup

# install bash 
# https://www.howtogeek.com/249966/how-to-install-and-use-the-linux-bash-shell-on-windows-10/

# install google cloud emulator
#https://github.com/GoogleCloudPlatform/cloud-functions-emulator

# install node in bash
# https://aigeec.com/installing-node-js-on-windows-10-bash/

PROJECT_LOCAL_DIR=/mnt/c/Users/tomho/gcp/gcp_parking/
GCP_PROJECT_NAME="parkingfinder-6bbaa"

if [ ! -d "$PROJECT_LOCAL_DIR" ]; then
	echo "$PROJECT_LOCAL_DIR does not exist. exiting."
	exit
fi

cd "$PROJECT_LOCAL_DIR"

npm install -d

echo "project name : "
echo $GCP_PROJECT_NAME

NPM_BIN=`npm bin`
echo $GCP_PROJECT_NAME | $NPM_BIN/functions start

$NPM_BIN/functions deploy helloWorld --trigger-http
$NPM_BIN/functions deploy findParking --trigger-http
$NPM_BIN/functions deploy version --trigger-http


$NPM_BIN/functions config list --json

echo "access console using '$NPM_BIN/functions logs read'"
