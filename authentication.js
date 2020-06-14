"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.authorize = void 0;

var fs = require("fs");

var _require = require("googleapis"),
    google = _require.google;
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */


var authorize = function authorize(credentials, options) {
  var _credentials$installe = credentials.installed,
      client_secret = _credentials$installe.client_secret,
      client_id = _credentials$installe.client_id,
      redirect_uris = _credentials$installe.redirect_uris;
  var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]); // Check if we have previously stored a token.

  if (fs.existsSync(options.tokenFile)) {
    var token = fs.readFileSync(options.tokenFile, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
  } else {
    getAccessToken(oAuth2Client, options);
  }

  return oAuth2Client;
};
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */


exports.authorize = authorize;

var getAccessToken = function getAccessToken(oAuth2Client, options) {
  if (options.authorizationCode) {
    oAuth2Client.getToken(options.authorizationCode, function (err, token) {
      if (err) {
        return console.error("Error retrieving access token", err);
      }

      oAuth2Client.setCredentials(token); // Store the token to disk for later program executions

      fs.writeFileSync(options.tokenFile, JSON.stringify(token));

      if (err) {
        return console.error(err);
      }
    });
  } else {
    var authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: options.scopes
    });
    console.log("Authorize this app by visiting this url:", authUrl);
  }
};