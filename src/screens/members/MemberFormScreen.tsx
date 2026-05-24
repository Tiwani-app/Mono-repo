import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const MemberFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Add Member"
    body="Admin member creation has a dedicated route now. The next pass can replace this scaffold with a React Hook Form screen wired to membersService."
    bullets={["Identity and contact fields", "Role and member status", "Financial standing", "Optional family details"]}
    navigation={navigation}
  />
);

export default MemberFormScreen;
