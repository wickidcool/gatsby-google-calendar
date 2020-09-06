const fs = require("fs")
const { google } = require("./node_modules/googleapis")
const moment = require("./node_modules/moment")
const uuid = require("uuid")
const { authorize } = require("./authentication")

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
 * ============================================================================
 * Build the slug for the event
 * ============================================================================
 */
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
