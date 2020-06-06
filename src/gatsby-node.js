const fs = require("fs")
const { google } = require("googleapis")
const moment = require("moment")
const uuid = require("uuid")

const requiredFields = ["id", "internal"]
const defaultOptions = {
  tokenFile: "",
  includedFields: [
    "start",
    "end",
    "summary",
    "status",
    "organizer",
    "description",
    "location",
    "slug",
  ],
  calendarId: "",
  assumedUser: "",
  envVar: "",
  pemFilePath: "",
  // only events starting two weeks ago
  timeMin: moment().subtract(2, "W").format(),
  // only events 3 month from now
  timeMax: moment().add(3, "M").format(),
  scopes: [
    `https://www.googleapis.com/auth/calendar.events.readonly`,
    `https://www.googleapis.com/auth/calendar.readonly`,
  ],
}
const forbiddenChars = [",", "!", "#", "?", "."]
/**
 * ============================================================================
 * Verify plugin loads
 * ============================================================================
 */
// should see message in console when running `gatsby develop` in example-site

exports.onPreInit = () => console.log("Loaded gatsby-source-google-calendar")
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

const authorize = (credentials, options) => {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  ) // Check if we have previously stored a token.

  if (fs.existsSync(options.tokenFile)) {
    const token = fs.readFileSync(options.tokenFile, "utf8")
    oAuth2Client.setCredentials(JSON.parse(token))
  } else {
    getAccessToken(oAuth2Client, options)
  }

  return oAuth2Client
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */

const getAccessToken = (oAuth2Client, options) => {
  if (options.authorizationCode) {
    oAuth2Client.getToken(options.authorizationCode, (err, token) => {
      if (err) {
        return console.error("Error retrieving access token", err)
      }

      oAuth2Client.setCredentials(token) // Store the token to disk for later program executions

      fs.writeFileSync(options.tokenFile, JSON.stringify(token))

      if (err) {
        return console.error(err)
      }
    })
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: options.scopes,
    })
    console.log("Authorize this app by visiting this url:", authUrl)
  }
}

const getSlug = (event) => {
  const summary = event.summary
    .split(" ")
    .map((word) => {
      return word
        .toLowerCase()
        .split("")
        .filter((char) => !forbiddenChars.includes(char))
        .join("")
    })
    .join("-")
  const date = event.start.date
    ? event.start.date
    : moment(event.start.dateTime).format("MM-DD-YYYY")
  return `${date}/${summary}`
}

const processEvents = (event, fieldsToInclude) => {
  return Object.keys(event).reduce((acc, key) => {
    if (fieldsToInclude.concat(requiredFields).includes(key)) {
      return { ...acc, [key]: event[key] }
    }

    return acc
  }, {})
}

exports.sourceNodes = (
  { actions, createNodeId, createContentDigest },
  options = defaultOptions
) => {
  return new Promise((resolve, reject) => {
    console.log("Loading calendar events...")
    const { createNode } = actions
    const {
      calendarId,
      includedFields,
      timeMax,
      timeMin,
      scopes,
      pemFilePath,
      tokenFile,
      authorizationCode,
    } = { ...defaultOptions, ...options } // Load client secrets from a local file.

    const content = require(pemFilePath)

    try {
      const auth = authorize(content, {
        scopes,
        tokenFile,
        authorizationCode,
      })

      const calendar = google.calendar({
        version: "v3",
        auth,
      })

      calendar.events.list(
        {
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
        },
        (err, res) => {
          if (err) return console.log("The API returned an error: " + err)
          const events = res.data.items

          if (events.length) {
            try {
              events
                .map((event) => {
                  const nodeData = {
                    ...processEvents(event, includedFields),
                    slug: getSlug(event),
                    id: createNodeId(`google-calendar-event-data-${uuid.v4()}`),
                  }
                  return {
                    ...nodeData,
                    internal: {
                      contentDigest: createContentDigest(nodeData),
                      content: JSON.stringify(nodeData),
                      type: "GoogleCalendarEvent",
                    },
                  }
                })
                .forEach((event) => {
                  createNode(event)
                })
              console.log(`Loaded ${events.length} events.`)
              resolve()
            } catch (error) {
              console.log({
                error,
              })
              reject(error)
            }
          } else {
            console.log("No upcoming events found.")
            resolve()
          }
        }
      )
    }
    catch(error) {
      console.log({error})
      reject(error)
    }
  })
}
