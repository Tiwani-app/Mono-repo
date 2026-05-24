import { AppTabParamList } from "./types";

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
