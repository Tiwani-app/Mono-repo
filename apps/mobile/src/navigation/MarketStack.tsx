import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ListingFormScreen from "../screens/marketplace/ListingFormScreen";
import MarketplaceScreen from "../screens/MarketplaceScreen";
import { MarketStackParamList } from "./types";

const Stack = createNativeStackNavigator<MarketStackParamList>();

const MarketStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
    <Stack.Screen name="ListingForm" component={ListingFormScreen} />
  </Stack.Navigator>
);

export default MarketStack;
