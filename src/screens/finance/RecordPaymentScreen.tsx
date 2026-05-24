import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const RecordPaymentScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Record Payment"
    body="Payment recording now has a route from Dashboard and Finance. The form pass can choose a member, amount, method, reference, and notes."
    bullets={["Member selector", "Amount and payment method", "Reference", "Service-backed submit state"]}
    navigation={navigation}
  />
);

export default RecordPaymentScreen;
