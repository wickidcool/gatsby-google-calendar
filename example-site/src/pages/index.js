import React from "react";
export default ({ data }) => {
  const eventData = data ? data.allGoogleCalendarEvent.nodes : []

  return (
    <div>
      {eventData.map(event => {
        return (
          <div>
            Date: {event.start.dateTime} - {event.end.dateTime} <br />
            Status: {event.status} <br />
            Location: {event.location} <br />
            Slug: {event.slug} <br />
            Summary: {event.summary} <br />
          </div>
        );
      })}
    </div>
  )
}

export const query = graphql`
  query allGoogleEventsQuery {
    allGoogleCalendarEvent {
      nodes {
        location
        slug
        start {
          dateTime
        }
        summary
        status
        end {
          dateTime
        }
      }
    }
  }
`