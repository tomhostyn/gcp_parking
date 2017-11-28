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

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
  
exports.helloGET = function helloGET (req, response) {

	console.log(">> helloGet")
	console.log("v16")
  
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
 