var http = require('http')
var https = require('https')
var xml2js = require('xml2js')

const DialogflowApp = require('actions-on-google').DialogflowApp; // Google Assistant helper library


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



function logAgentRequest(request){
	
	switch (request.method) {
    case 'GET':
      console.log("GET");
      break;
    case 'PUT':
      console.log("PUT");
      break;
    case 'POST':
      console.log("POST");
      break;
    default:
      console.error ("unsupported HTTP method: " + request.method);
      break;
	}
	
	console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

	if (request.body.result) {
		console.log("Dialogflow V1 request");
	} else if (request.body.queryResult) {
		console.log("Dialogflow V2 request");
	} else {
		console.log('Dialogflow Invalid Request');
	}	
	
	if (request.body.result.action === undefined){
		console.error("no request.body.result.action");
	} else {
		console.log("request.body.result.action: ",request.body.result.action);
	}
	
	let requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;
	const googleAssistantRequest = 'google'; // Constant to identify Google Assistant requests
	if (requestSource === googleAssistantRequest) {
		console.log("request from google assistant");
	} else {
		console.error("request from unknown source");
	}
}

/**
 * HTTP Cloud Function.
 *
 * @param {Object} request Cloud Function request context.
 * @param {Object} response Cloud Function response context.
 */

exports.findParking = function findParkingFulfilment (request, response) {
	console.log(">> findParkingFulfilment")
	console.log("v27")
	
	logAgentRequest(request)
	
	if (request.body.result) {
		processV1Request(request, response);
		console.log("V1");
	} else if (request.body.queryResult) {
		console.error ("Dialogflow V2 requests not supported");
		response.status(501).send({ error: 'Dialogflow V2 requests not supported' });
	} else {
		console.error('Invalid Request');
		return response.status(400).end('Invalid Webhook Request (expecting v1 or v2 webhook request)');
	}	
	console.log("<< findParkingFulfilment")
}


/*
 * Function to handle v1 webhook requests from Dialogflow
 */
function processV1Request (request, response) {
  let action = request.body.result.action; // https://dialogflow.com/docs/actions-and-parameters
  let parameters = request.body.result.parameters; // https://dialogflow.com/docs/actions-and-parameters
  let inputContexts = request.body.result.contexts; // https://dialogflow.com/docs/contexts
  let requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;

  const googleAssistantRequest = 'google'; // Constant to identify Google Assistant requests
  const app = new DialogflowApp({request: request, response: response});

  // Create handlers for Dialogflow actions as well as a 'default' handler
  const actionHandlers = {
    // The default welcome intent has been matched, welcome the user (https://dialogflow.com/docs/events#default_welcome_intent)
    'input.welcome': () => {
		console.log("input.welcome intent matched")
		welcome_response = {
			googleRichResponse: parkingWelcomeRichResponse
		};
		sendGoogleResponse(welcome_response); // Send simple response to user
    },
    // The find.parking intent has been matched, build a response with appropriate parkings
    'find.parking': () => {
		console.log("find.parking intent matched")
		sendParkingResponse(request)
		
    },
    // The debug intent has been matched
    'debug.here': () => {
		console.log("find.parking intent matched")
        let responseToUser = {
			googleRichResponse: parkingWelcomeRichResponse
		};	
		sendGoogleResponse(responseToUser);
    },
    // The parking.welcome intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'parking.welcome': () => {
		console.error("parking.welcome intent matched")
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        let responseToUser = {
          googleRichResponse: parkingWelcomeRichResponse, // Optional, uncomment to enable
          //googleOutputContexts: ['weather', 2, { ['city']: 'rome' }], // Optional, uncomment to enable
          speech: 'woof woof', // spoken response
          text: 'must cook' // displayed response
        };
		sendGoogleResponse(responseToUser);
      }
    },
    // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'input.unknown': () => {
		console.error("input.unknown intent matched")
        sendGoogleResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
    },
    // Default handler for unknown or undefined actions
    'default': () => {
		console.error("default intent matched")
        let responseToUser = {
          speech: 'search and destroy', // spoken response
          text: 'stay home read a book' // displayed response
        };
        sendGoogleResponse(responseToUser);
    }
  };

  // If undefined or unknown action use the default handler
  if (!actionHandlers[action]) {
    action = 'default';
  }

  // Run the proper handler function to handle the request from Dialogflow
  actionHandlers[action]();

    // Function to send correctly formatted Google Assistant responses to Dialogflow which are then sent to the user
  function sendGoogleResponse (responseToUser) {
    if (typeof responseToUser === 'string') {
      app.ask(responseToUser); // Google Assistant response
	  console.log('sendGoogleResponse Response to Dialogflow (string): ' + JSON.stringify(responseToUser));

    } else {
      // If speech or displayText is defined use it to respond
      let googleResponse = app.buildRichResponse().addSimpleResponse({
        speech: responseToUser.speech || responseToUser.displayText,
        displayText: responseToUser.displayText || responseToUser.speech
      });
      // Optional: Overwrite previous response with rich response
      if (responseToUser.googleRichResponse) {
        googleResponse = responseToUser.googleRichResponse;
      }
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      if (responseToUser.googleOutputContexts) {
        app.setContext(...responseToUser.googleOutputContexts);
      }

	  console.log('sendGoogleResponse Response to Dialogflow (rich): ' + JSON.stringify(responseToUser));
      app.ask(googleResponse); // Send response to Dialogflow and Google Assistant
    }
  }

  
 // from https://www.brussels-parking-guidance.com/API/API/Datex/Export?publication=static&publication=static
var BrusselsParkings = {
	"Dansaert" : {
		name: "Dansaert",
		id:"AD7B77E6-A7AA-441A-8686-7B88CE92CF96",
		places: "221"
	},
	"Louise" : {
		name: "Louise",
		id:"C4E6F4CD-BEB7-408C-A184-C68A4EFA7F5A",
		places: "320"
	},
	"Simonis": {
		name: "Simonis",
		id:"B2FAAD2C-D797-40AC-8F5B-45FDE656A257",
		places: "132"
	},	
	"Bota": {
		name: "Bota",
		id:"0C5DD4C3-01A5-482D-9D71-4E15FCFAA428",
		places: "105"
	},
	"Rogier": {
		name: "Rogier",
		id:"59C99FB5-EA3C-4777-B4E7-18C4FD9C64A3",
		places: "686"
	}
}


  
 function sendParkingResponse(request){

	 var ParkingPerArea = {
		'north':["Bota", "Rogier"],
		'downtown': ["Dansaert"],
		'midi': ["Dansaert"]
	}

	// add some aliases
	ParkingPerArea["north station"] = ParkingPerArea['north']

	ParkingPerArea["midi station"] = ParkingPerArea['midi']
	ParkingPerArea["south station"] = ParkingPerArea['midi']
	ParkingPerArea["south"] = ParkingPerArea['midi']

	  // Construct rich response for Google Assistant (v1 requests only)
	const app = new DialogflowApp();
	
	var zone = 'North'.toLowerCase()
	parkingNames = ParkingPerArea[zone] || [];
	
	///////////////////
	var options = {
		host: 'www.brussels-parking-guidance.com',
		path: '/API/API/Datex/Export?publication=dynamic&publication=dynamic'
	};
	
	var body = ""

	https.get(options, function(res) {
		console.log("http Got response: " + res.statusCode);
	  
		// Continuously update stream with data
		var parkingXML = ""
		res.on('data', function(d) {
			console.log("res.on data");
			parkingXML += d;
		});
		
		res.on('end', function() {
			console.log("res.on end");
			console.log("------------------------------------");
			console.log(parkingXML);
			console.log("------------------------------------");						
		
		
			var parkingStatus = parseParkingBxl(parkingXML)
	
			console.log(JSON.stringify(parkingStatus))
			
			body = ""
			for (var i in parkingNames){
				parking_name = parkingNames[i]
				parking_id = BrusselsParkings[parking_name].id
				var parking_stat 
				
				if (parkingStatus[parking_id].open != "open"){
					parking_stat = "__Closed__"
				} else if (parkingStatus[parking_id].status == "spacesAvailable"){
					parking_stat = "__Available__"
				} else if (parkingStatus[parking_id].status == "almostFull"){
					parking_stat = "__Almost Full__"
				} else {
					parking_stat = "__Full__"
				}
			
			body += parking_name + ":  \t" + parking_stat + "  \n"
			}
			
			const parkingRichResponse = app.buildRichResponse()
				.addSimpleResponse('I found the following parkings around ' + zone)
				.addSuggestions(['👍'])
				.addBasicCard(app.buildBasicCard(body)
				// Create a basic card and add it to the rich response
				.setTitle('Brussels real time parking info')
				.setImage('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Feature_parking.svg/1000px-Feature_parking.svg.png',
				  'car parking'));

			let responseToUser = {
					googleRichResponse: parkingRichResponse
				};
				sendGoogleResponse(responseToUser);
			});
			
			}).on('error', function(e) {
			  console.log("http Got error: " + e.message);
			});	
}

  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse (responseToUser) {
    // if the response is a string send it as a response to the user
    if (typeof responseToUser === 'string') {
      let responseJson = {};
      responseJson.speech = responseToUser; // spoken response
      responseJson.displayText = responseToUser; // displayed response
      response.json(responseJson); // Send response to Dialogflow
	  console.log('Response to Dialogflow (string): ' + JSON.stringify(responseJson));

    } else {
      // If the response to the user includes rich responses or contexts send them to Dialogflow
      let responseJson = {};
      // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
      responseJson.speech = responseToUser.speech || responseToUser.displayText;
      responseJson.displayText = responseToUser.displayText || responseToUser.speech;
      // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
      responseJson.data = responseToUser.data;
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      responseJson.contextOut = responseToUser.outputContexts;

      console.log('Response to Dialogflow(rich): ' + JSON.stringify(responseJson));
      response.json(responseJson); // Send response to Dialogflow
    }
  }
}

	  // Construct rich response for Google Assistant (v1 requests only)
	const app = new DialogflowApp();
	const googleRichResponse = app.buildRichResponse()
		.addSimpleResponse('This is the first simple response for Google Assistant')
		.addSuggestions(
		['Suggestion Chip', 'Another Suggestion Chip'])
		// Create a basic card and add it to the rich response
		.addBasicCard(app.buildBasicCard(`This is a basic card.  Text in a
		basic card can include "quotes" and most other unicode characters
		including emoji 📱.  Basic cards also support some markdown
		formatting like *emphasis* or _italics_, **strong** or __bold__,
		and ***bold itallic*** or ___strong emphasis___ as well as other things
		like line  \nbreaks`) // Note the two spaces before '\n' required for a
							// line break to be rendered in the card
		.setSubtitle('This is a subtitle')
		.setTitle('Title: this is a title')
		.addButton('This is a button', 'https://assistant.google.com/')
		.setImage('https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
		  'Image alternate text'))
		.addSimpleResponse({ speech: 'This is another simple response',
		displayText: 'This is the another simple response 💁' });

	const parkingWelcomeRichResponse = app.buildRichResponse()
		.addSimpleResponse('Welcome. Here\'s some real time parking info')
		.addSuggestions(
		['Downtown', 'Midi', 'North'])
		// Create a basic card and add it to the rich response
		.addBasicCard(app.buildBasicCard(``)
		.setTitle('Brussels real time parking info')
		.setImage('http://www.changiairport.com/content/dam/cag/3-transports/x3.0_transport-icon-big-7.png.pagespeed.ic.ypgOjLWv_Q.png',
		  'car parking'))
		.addSimpleResponse({ speech: 'Where are you headed?',
		displayText: 'Where are you headed? 🚗' });


// Rich responses for Slack and Facebook for v1 webhook requests
const richResponsesV1 = {
  'slack': {
    'text': 'This is a text response for Slack.',
    'attachments': [
      {
        'title': 'Title: this is a title',
        'title_link': 'https://assistant.google.com/',
        'text': 'This is an attachment.  Text in attachments can include \'quotes\' and most other unicode characters including emoji 📱.  Attachments also upport line\nbreaks.',
        'image_url': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
        'fallback': 'This is a fallback.'
      }
    ]
  },
  'facebook': {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': [
          {
            'title': 'Title: this is a title',
            'image_url': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
            'subtitle': 'This is a subtitle',
            'default_action': {
              'type': 'web_url',
              'url': 'https://assistant.google.com/'
            },
            'buttons': [
              {
                'type': 'web_url',
                'url': 'https://assistant.google.com/',
                'title': 'This is a button'
              }
            ]
          }
        ]
      }
    }
  }
};



function fetchRTParkingData(req){
	console.log(">> fetchRTParkingData")
	
	var options = {
		host: 'www.brussels-parking-guidance.com',
		path: '/API/API/Datex/Export?publication=dynamic&publication=dynamic'
	};
	
	var body = ""

	https.get(options, function(res) {
		console.log("http Got response: " + res.statusCode);
	  
		// Continuously update stream with data
		res.on('data', function(d) {
			console.log("res.on data");
			body += d;
		});
		
		res.on('end', function() {
			console.log("res.on end");
			console.log("------------------------------------");
			console.log(body);
			console.log("------------------------------------");						
		});
	}).on('error', function(e) {
	  console.log("http Got error: " + e.message);
	});
	
	console.log("<< fetchRTParkingData")
	return body
 };
	


  
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
			for (var i in BrusselsParkings){
				if ((parkingStatus[BrusselsParkings[i].id].open == "open") 
						&& (parkingStatus[BrusselsParkings[i].id].status == "spacesAvailable")){
					body = BrusselsParkings[i].name + " has space available"
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
 