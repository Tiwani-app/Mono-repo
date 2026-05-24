import React from "react";
import WorkflowPlaceholderScreen from "../admin/WorkflowPlaceholderScreen";

const ListingFormScreen = ({ navigation }: any) => (
  <WorkflowPlaceholderScreen
    title="Listing Form"
    body="Marketplace listing creation and editing now has a route. The form pass can replace the previous draft behavior with validated fields."
    bullets={["Title and description", "Price and condition", "Status", "Image picker fallback"]}
    navigation={navigation}
  />
);

export default ListingFormScreen;
