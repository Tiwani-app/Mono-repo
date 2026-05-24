import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const DuesPeriodFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="New Dues Period"
    body="Dues period creation now has a finance route. The next pass can validate name, amount, due date, and submit through financeService."
    bullets={["Period name", "Amount", "Due date", "Activation status"]}
    navigation={navigation}
  />
);

export default DuesPeriodFormScreen;
