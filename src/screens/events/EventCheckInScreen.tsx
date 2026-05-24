import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const EventCheckInScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Event Check-In"
    badge="ADMIN CHECK-IN"
    body="The check-in route is in place for admins. It will render RSVP attendees and call the check-in service when backend support is available."
    bullets={["Attendee list", "Checked-in state", "Manual check-in action"]}
    navigation={navigation}
  />
);

export default EventCheckInScreen;
