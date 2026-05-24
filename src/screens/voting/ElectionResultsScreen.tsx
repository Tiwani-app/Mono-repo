import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const ElectionResultsScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Election Results"
    badge="RESULTS VIEW"
    body="Election results have a destination for electoral-chairman and permitted result states. It will render service-returned tallies when available."
    bullets={["Permission-aware result state", "Race-by-race tallies", "Published result handling"]}
    navigation={navigation}
  />
);

export default ElectionResultsScreen;
