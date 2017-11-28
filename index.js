var http = require('http')
var https = require('https')
var xml2js = require('xml2js')


/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
 
exports.helloGET = function helloGET2 (req, res) {
	res.send('Hello World!');
}
 
exports.helloGET = function helloGET (req, response) {

	console.log(">> helloGet")
	console.log("v16")
  
  // https://www.brussels-parking-guidance.com/API/API/Datex/Export?publication=dynamic&amp;publication=dynamic&amp;publication=dynamic&amp;publication=dynamic
	var options = {
		host: 'www.brussels-parking-guidance.com',
//		port: 80,
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
			
			console.log("test sample xml");
			var parseString = xml2js.parseString;
			var xml = "<root>Hello xml2js!</root>"
			parseString(xml, function (err, result) {
				console.log("parsed xml sample");
				console.dir(result);
				console.log(result.root)
				console.log("parseString err")
				console.dir(err);

			});

			console.log("test bxl xml");
			var parseString = require('xml2js').parseString;
			var xml = body
			parseString(xml, function (err, result) {
				console.log("parsed xml bxl");
				console.log("in parseString")
				console.log(result.d2LogicalModel.$.modelBaseVersion)

				console.dir(result);
				console.log("parseString err")
				console.dir(err);
			});
			

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
 