import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const AdHocChargeScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Ad Hoc Charge"
    body="Ad hoc charges now have a finance route. The next pass can add charge type, member targeting, amount, due date, and notes."
    bullets={["Charge type", "Member targeting", "Amount and due date", "Optional note"]}
    navigation={navigation}
  />
);

export default AdHocChargeScreen;
