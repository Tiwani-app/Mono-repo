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

interface TabNavigation {
  getState: () => any;
  dispatch: (action: unknown) => void;
}

// Rebuilds only the given tab's route object; a fresh route (new key, no
// params, no state) remounts that one stack at its initial screen. Other tabs
// keep their route objects, so their screens stay mounted untouched.
const rebuildTabRoute = (
  navigation: TabNavigation,
  routeName: keyof AppTabParamList,
) => {
  const state = navigation.getState();
  navigation.dispatch(
    CommonActions.reset({
      index: state.index,
      routes: state.routes.map((route: { name: string }) =>
        route.name === routeName ? { name: route.name } : route,
      ),
    }),
  );
};

// Returns the given tab's nested stack to its root, keeping the root screen
// (and its Firestore subscriptions) mounted where possible. Cheaper than
// resetting the whole tab navigator state, which remounts every stack.
const returnTabToRoot = (
  navigation: TabNavigation,
  routeName: keyof AppTabParamList,
) => {
  const tabRoute = navigation
    .getState()
    .routes.find((route: { name: string }) => route.name === routeName);
  if (!tabRoute) {
    return;
  }
  const rootScreen = TAB_ROOT_ROUTES[routeName].screen;
  const nestedState = tabRoute.state;
  if (nestedState?.key) {
    if (nestedState.routes[0]?.name === rootScreen) {
      if ((nestedState.index ?? 0) > 0) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: nestedState.key,
        });
      }
      return;
    }
    // Cross-tab navigation (e.g. dashboard quick actions) can create the
    // stack with a nested screen as its first route; rebuild the tab so it
    // reopens at its real root.
    rebuildTabRoute(navigation, routeName);
    return;
  }
  // The nested stack keeps its initial state local until a navigation happens
  // inside it, so `tabRoute.state` is undefined here even when a quick action
  // opened the tab directly on a nested screen. That hidden screen is still
  // recorded in the tab route's params; rebuild the tab to clear it.
  const paramsScreen = (tabRoute.params as { screen?: string } | undefined)
    ?.screen;
  if (paramsScreen && paramsScreen !== rootScreen) {
    rebuildTabRoute(navigation, routeName);
  }
};

const AppNavigator = () => (
  <Tab.Navigator
    screenListeners={({ navigation, route }) => ({
      blur: () => returnTabToRoot(navigation, route.name),
      tabPress: () => {
        const state = navigation.getState();
        if (state.routes[state.index]?.name === route.name) {
          returnTabToRoot(navigation, route.name);
        }
      },
    })}
    screenOptions={({ route }) => ({
      headerShown: false,
      sceneContainerStyle: { backgroundColor: colors.bg.secondary },
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
