/**
 * MainController
 *
 * @module		:: Controller
 * @description	:: Contains logic for handling requests.
 */

module.exports = {

	index: function (req, res) {
		res.view();
	},
	tag: function (req, res) {
		res.view("main/index");
	},
	readabilityarticle: function (req, res) {
		var request = require('request');
		var urlString = req.param('urlString');
		var parserApiToken = '2c607eb83344131b730f0f2739958e414f21a5a6'; 	//Liisi's token, get your own from http://www.readability.com/developers/api/parser
			
		request.get('https://readability.com/api/content/v1/parser?url=' + decodeURIComponent(urlString) + "&token=" + parserApiToken, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				res.contentType('application/json; charset=utf-8');
				res.send(body, 200);
			}
		});
	}
}
