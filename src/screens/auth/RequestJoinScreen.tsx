import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const RequestJoinScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Request to Join"
    badge="JOIN REQUEST"
    body="This screen is now routed from Login and will collect a prospective member's name, email, phone, and message before calling the members service."
    bullets={["Full name", "Email address", "Phone number", "Message to admins"]}
    navigation={navigation}
  />
);

export default RequestJoinScreen;
