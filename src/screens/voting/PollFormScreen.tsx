import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const PollFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="New Poll"
    body="Poll creation now has a dedicated route. The form pass can add a question, options, status controls, and close actions through votingService."
    bullets={["Poll title and question", "Two or more options", "Draft/open status", "Close poll action"]}
    navigation={navigation}
  />
);

export default PollFormScreen;
