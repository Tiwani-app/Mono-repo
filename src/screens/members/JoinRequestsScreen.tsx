import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const JoinRequestsScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Join Requests"
    badge="ADMIN REVIEW"
    body="Join request review has a route in the Home stack. It will show pending, approved, and declined requests once the request service is filled in."
    bullets={["Pending requests", "Approve through service", "Decline with confirmation"]}
    navigation={navigation}
  />
);

export default JoinRequestsScreen;
