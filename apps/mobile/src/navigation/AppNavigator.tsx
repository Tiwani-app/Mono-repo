import React from "react";
import { CommonActions, StackActions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "../components/common/FeatherIcon";
import DashboardStack from "./DashboardStack";
import EventsStack from "./EventsStack";
import FinanceStack from "./FinanceStack";
import MarketStack from "./MarketStack";
import VotingStack from "./VotingStack";
import { colors } from "../theme";
import { AppTabParamList } from "./types";
import { TAB_ROOT_ROUTES } from "./tabRoutes";

const Tab = createBottomTabNavigator<AppTabParamList>();

// Returns only the given tab's nested stack to its root, keeping the root
// screen (and its Firestore subscriptions) mounted where possible. Cheaper
// than resetting the whole tab navigator state, which remounts every stack.
const popNestedStackToRoot = (
  navigation: { getState: () => any; dispatch: (action: unknown) => void },
  routeName: keyof AppTabParamList,
) => {
  const tabRoute = navigation
    .getState()
    .routes.find((route: { name: string }) => route.name === routeName);
  const nestedState = tabRoute?.state;
  if (!nestedState?.key) {
    return;
  }
  const rootScreen = TAB_ROOT_ROUTES[routeName].screen;
  // Cross-tab navigation (e.g. dashboard quick actions) can create the stack
  // with a nested screen as its only route; popToTop would stay there, so
  // reset that stack to its real root instead.
  if (nestedState.routes[0]?.name !== rootScreen) {
    navigation.dispatch({
      ...CommonActions.reset({ index: 0, routes: [{ name: rootScreen }] }),
      target: nestedState.key,
    });
    return;
  }
  if ((nestedState.index ?? 0) > 0) {
    navigation.dispatch({
      ...StackActions.popToTop(),
      target: nestedState.key,
    });
  }
};

const AppNavigator = () => (
  <Tab.Navigator
    screenListeners={({ navigation, route }) => ({
      blur: () => popNestedStackToRoot(navigation, route.name),
      tabPress: () => {
        const state = navigation.getState();
        if (state.routes[state.index]?.name === route.name) {
          popNestedStackToRoot(navigation, route.name);
        }
      },
    })}
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bg.secondary,
        borderTopColor: colors.border.subtle,
        paddingBottom: 6,
        height: 60,
      },
      tabBarActiveTintColor: colors.gold.default,
      tabBarInactiveTintColor: colors.text.tertiary,
      tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      tabBarLabel: {
        Dashboard: "Home",
        Events: "Events",
        Voting: "Vote",
        Finance: "Finance",
        Market: "Market",
      }[route.name],
      tabBarIcon: ({ color, size }) => {
        const icons: Record<keyof AppTabParamList, string> = {
          Dashboard: "home",
          Events: "calendar",
          Voting: "check-circle",
          Finance: "credit-card",
          Market: "shopping-bag",
        };
        return <Icon name={icons[route.name]} size={size - 2} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Events" component={EventsStack} />
    <Tab.Screen name="Voting" component={VotingStack} />
    <Tab.Screen name="Finance" component={FinanceStack} />
    <Tab.Screen name="Market" component={MarketStack} />
  </Tab.Navigator>
);

export default AppNavigator;
