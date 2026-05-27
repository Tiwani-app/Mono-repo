import { AppTabParamList } from "./types";

export const TAB_ORDER: (keyof AppTabParamList)[] = [
  "Dashboard",
  "Events",
  "Voting",
  "Finance",
  "Market",
];

export const TAB_ROOT_ROUTES: Record<
  keyof AppTabParamList,
  { screen: string }
> = {
  Dashboard: { screen: "DashboardHome" },
  Events: { screen: "EventsList" },
  Voting: { screen: "VotingHub" },
  Finance: { screen: "FinanceAdmin" },
  Market: { screen: "Marketplace" },
};

export const getTabRootResetState = (tabName: keyof AppTabParamList) => ({
  index: TAB_ORDER.indexOf(tabName),
  routes: TAB_ORDER.map(name => ({
    name,
    state: {
      routes: [{ name: TAB_ROOT_ROUTES[name].screen }],
    },
  })),
});
