const fs = require("fs")
const { google } = require("googleapis")

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
export const authorize = (credentials, options) => {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )

  // Check if we have previously stored a token.
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
      oAuth2Client.setCredentials(token)

      // Store the token to disk for later program executions
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
