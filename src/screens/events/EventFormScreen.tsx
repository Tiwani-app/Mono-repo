import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const EventFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="New Event"
    body="Event creation and editing now have a stack destination. The form pass can wire title, category, date, location, capacity, and status to eventsService."
    bullets={["Title and description", "Category selector", "Date, time, and location", "Capacity and publish status"]}
    navigation={navigation}
  />
);

export default EventFormScreen;
