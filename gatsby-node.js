"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.array.includes");

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.reduce");

require("core-js/modules/es.object.get-own-property-descriptor");

require("core-js/modules/es.object.get-own-property-descriptors");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.exec");

require("core-js/modules/es.string.includes");

require("core-js/modules/es.string.split");

require("core-js/modules/web.dom-collections.for-each");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var fs = require("fs");

var _require = require("googleapis"),
    google = _require.google;

var moment = require("moment");

var uuid = require("uuid");

var _require2 = require("./authentication"),
    authorize = _require2.authorize;

var requiredFields = ["id", "internal"];
var defaultOptions = {
  tokenFile: "",
  includedFields: ["start", "end", "summary", "status", "organizer", "description", "location", "slug"],
  calendarId: "",
  assumedUser: "",
  envVar: "",
  pemFilePath: "",
  // only events starting two weeks ago
  timeMin: moment().subtract(2, "W").format(),
  // only events 3 month from now
  timeMax: moment().add(3, "M").format(),
  scopes: ["https://www.googleapis.com/auth/calendar.events.readonly", "https://www.googleapis.com/auth/calendar.readonly"]
};
var forbiddenChars = [",", "!", "#", "?", "."];
/**
 * ============================================================================
 * Verify plugin loads
 * ============================================================================
 */
// should see message in console when running `gatsby develop` in example-site

exports.onPreInit = function () {
  return console.log("Loaded gatsby-source-google-calendar");
};
/**
 * ============================================================================
 * Build the slug for the event
 * ============================================================================
 */


var getSlug = function getSlug(event) {
  var summary = event.summary.split(" ").map(function (word) {
    return word.toLowerCase().split("").filter(function (char) {
      return !forbiddenChars.includes(char);
    }).join("");
  }).join("-");
  var date = event.start.date ? event.start.date : moment(event.start.dateTime).format("MM-DD-YYYY");
  return "".concat(date, "/").concat(summary);
};

var processEvents = function processEvents(event, fieldsToInclude) {
  return Object.keys(event).reduce(function (acc, key) {
    if (fieldsToInclude.concat(requiredFields).includes(key)) {
      return _objectSpread(_objectSpread({}, acc), {}, _defineProperty({}, key, event[key]));
    }

    return acc;
  }, {});
};

exports.sourceNodes = function (_ref) {
  var actions = _ref.actions,
      createNodeId = _ref.createNodeId,
      createContentDigest = _ref.createContentDigest;
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultOptions;
  return new Promise(function (resolve, reject) {
    console.log("Loading calendar events...");
    var createNode = actions.createNode;

    var _defaultOptions$optio = _objectSpread(_objectSpread({}, defaultOptions), options),
        calendarId = _defaultOptions$optio.calendarId,
        includedFields = _defaultOptions$optio.includedFields,
        timeMax = _defaultOptions$optio.timeMax,
        timeMin = _defaultOptions$optio.timeMin,
        scopes = _defaultOptions$optio.scopes,
        pemFilePath = _defaultOptions$optio.pemFilePath,
        tokenFile = _defaultOptions$optio.tokenFile,
        authorizationCode = _defaultOptions$optio.authorizationCode; // Load client secrets from a local file.


    var content = require(pemFilePath);

    try {
      var auth = authorize(content, {
        scopes: scopes,
        tokenFile: tokenFile,
        authorizationCode: authorizationCode
      });
      var calendar = google.calendar({
        version: "v3",
        auth: auth
      });
      calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: "startTime"
      }, function (err, res) {
        if (err) return console.log("The API returned an error: " + err);
        var events = res.data.items;

        if (events.length) {
          try {
            events.map(function (event) {
              var nodeData = _objectSpread(_objectSpread({}, processEvents(event, includedFields)), {}, {
                slug: getSlug(event),
                id: createNodeId("google-calendar-event-data-".concat(uuid.v4()))
              });

              return _objectSpread(_objectSpread({}, nodeData), {}, {
                internal: {
                  contentDigest: createContentDigest(nodeData),
                  content: JSON.stringify(nodeData),
                  type: "GoogleCalendarEvent"
                }
              });
            }).forEach(function (event) {
              createNode(event);
            });
            console.log("Loaded ".concat(events.length, " events."));
            resolve();
          } catch (error) {
            console.log({
              error: error
            });
            reject(error);
          }
        } else {
          console.log("No upcoming events found.");
          resolve();
        }
      });
    } catch (error) {
      console.log({
        error: error
      });
      reject(error);
    }
  });
};