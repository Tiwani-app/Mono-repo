import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const ElectionFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="New Election"
    body="Election creation now has a route for admin setup. The next implementation can add races, candidate management, ballot type, and open/close actions."
    bullets={["Ballot type", "Race setup", "Candidate management", "Open and close controls"]}
    navigation={navigation}
  />
);

export default ElectionFormScreen;
