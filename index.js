var http = require('http')
var https = require('https')
var xml2js = require('xml2js')


function parseParkingBxl(xml){
	
	var parseString = require('xml2js').parseString;
	let parkingRecords;
	var parkingDict = {}
	parseString(xml, function (err, result) {
		parkingRecords=result.d2LogicalModel.payloadPublication[0].genericPublicationExtension[0].parkingStatusPublication[0].parkingRecordStatus;
		
		console.log("parseParkingBxl")

		for (var i in parkingRecords) {
			pr = parkingRecords[i]
			console.log(pr.parkingRecordReference[0].$.id 
				+ " " + pr.parkingSiteOpeningStatus[0] 
				+ " " + pr.parkingSiteStatus[0])
			
			parkingDict[pr.parkingRecordReference[0].$.id] = {
				id: pr.parkingRecordReference[0].$.id,
				status: pr.parkingSiteStatus[0], 
				open: pr.parkingSiteOpeningStatus[0]
				}
			}
	   });
	return parkingDict
	}

// from https://www.brussels-parking-guidance.com/API/API/Datex/Export?publication=static&publication=static
var ParkingNames = {
	"AD7B77E6-A7AA-441A-8686-7B88CE92CF96" : {
		name: "Dansaert",
		id:"AD7B77E6-A7AA-441A-8686-7B88CE92CF96",
		places: "221"
	},
	"C4E6F4CD-BEB7-408C-A184-C68A4EFA7F5A" : {
		name: "Louise",
		id:"C4E6F4CD-BEB7-408C-A184-C68A4EFA7F5A",
		places: "320"
	},
	"B2FAAD2C-D797-40AC-8F5B-45FDE656A257": {
		name: "Simonis",
		id:"B2FAAD2C-D797-40AC-8F5B-45FDE656A257",
		places: "132"
	}
}

function logAgentRequest(req){
	console.log("id: " + req.id)
	console.log("id: " + req.timestamp)
	console.log(req.id)
	console.log(req.id)
	console.log(req.id)
	console.log(req.result.resolvedQuery)
	
}


exports.findParking = function findParkingFulfilment (req, res) {
	console.log(">> findParkingFulfilment")
	console.log("v25")
	
	request = req //orz
	
	switch (req.method) {
    case 'GET':
      console.log("GET");
	  res.status(200).send("GET")
      break;
    case 'PUT':
      console.log("PUT");
	  res.status(200).send("PUT")
      break;
    case 'POST':
      console.log("POST");
	  res.status(200).send("POST")
      break;
    default:
      console.error ("unsupported HTTP method: " + req.method);
	  console.log(req.method);
      res.status(500).send({ error: 'Something blew up!' });
      break;
  }
  
      if(req.rawBody) {
        console.log(req.rawBody.toString('base64'));
    } else {
        console.error (`No rawBody in request`);
    }
	
	if(req.body.text) {
        console.log(req.body.text);
    } else {
        console.error (`No req.body.text in request`);
    }

	
	console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  if (request.body.result) {
//    processV1Request(request, response);
        console.log("V1");

  } else if (request.body.queryResult) {
  //  processV2Request(request, response);
          console.log("V2");

  } else {
    console.log('Invalid Request');
    return response.status(400).end('Invalid Webhook Request (expecting v1 or v2 webhook request)');
  }


	console.log(req.body.text)
	
/*	
	if (req.body.message === undefined) {
    // This is an error case, as "message" is required
	console.error("No message defined")
    res.status(400).send('No message defined!');
  } else {
    // Everything is ok
    console.log(req.body.message);
    res.status(200).end();
  }		
  */
}

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
  
exports.helloGETX = function helloGETXX (req, response) {

	console.log(">> helloGet")
	console.log("v17")
  
	console.dir(req)
  
	var options = {
		host: 'www.brussels-parking-guidance.com',
		path: '/API/API/Datex/Export?publication=dynamic&publication=dynamic'
	};

	https.get(options, function(res) {
		console.log("http Got response: " + res.statusCode);
	  
		// Continuously update stream with data
		var body = '';
		res.on('data', function(d) {
			body += d;
		});
		
		res.on('end', function() {
			console.log("res.on end");
			console.log("------------------------------------");
	//		console.log(body);
			console.log("------------------------------------");
			

			console.log("test bxl xml");
			
			
			var parkingStatus = parseParkingBxl(body)
			
			let available = 0
			body = ""
			for (var i in ParkingNames){
				if ((parkingStatus[ParkingNames[i].id].open == "open") 
						&& (parkingStatus[ParkingNames[i].id].status == "spacesAvailable")){
					body = ParkingNames[i].name + " has space available"
					available += 1
					}
			}
			
			if (available == 0){
				body = "no places available"
			}

			response.send(body);

			console.log("json parse done");
		});

	  
	}).on('error', function(e) {
	  console.log("http Got error: " + e.message);
	});
	
	console.log("<< helloGet")
 };



/**
 *  gcloud beta functions deploy helloGET --stage-bucket gs://tom_hostyn_parking_staging --trigger-http
 *  https://us-central1-parkingfinder-6bbaa.cloudfunctions.net/helloGET
	https://us-central1-parkingfinder-6bbaa.cloudfunctions.net/GetBrussels
 */
 