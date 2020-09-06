const activeEnv =
  process.env.GATSBY_ACTIVE_ENV || process.env.NODE_ENV || "development"

require("dotenv").config({
  path: `.env.${activeEnv}`,
})

module.exports = {
  plugins: [
    // loads the source-plugin
    {
      resolve: `gatsby-source-google-calendar`,
      options: {
        pemFilePath: `${process.cwd()}/config/calendar-api.json`,
        calendarId: process.env.GATSBY_GOOGLE_CALENDAR_ID,
        tokenFile: "./config/google-token.json",
        authorizationCode: process.env.GOOGLE_AUTHENTICATION_CODE,
      },
    },
    // required to generate optimized images
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
};
