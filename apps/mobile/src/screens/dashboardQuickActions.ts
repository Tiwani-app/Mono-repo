import { getTabRootResetState, TAB_ROOT_ROUTES } from "../navigation/tabRoutes";
import { AppTabParamList } from "../navigation/types";

export interface DashboardQuickAction {
  icon: string;
  label: string;
  onPress: () => void;
}

interface DashboardNavigation {
  getParent?: () => { dispatch?: (action: object) => void } | undefined;
  navigate: (route: string, params?: object) => void;
}

const openTabRoot = (
  navigation: DashboardNavigation,
  tabName: keyof AppTabParamList,
) => {
  const parentNavigation = navigation.getParent?.();
  if (parentNavigation?.dispatch) {
    parentNavigation.dispatch({
      type: "RESET",
      payload: getTabRootResetState(tabName),
    });
    return;
  }

  navigation.navigate(tabName, TAB_ROOT_ROUTES[tabName]);
};

export const getDashboardQuickActions = (
  admin: boolean,
  navigation: DashboardNavigation,
): DashboardQuickAction[] =>
  admin
    ? [
        {
          icon: "user-plus",
          label: "Add Member",
          onPress: () => navigation.navigate("MemberForm"),
        },
        {
          icon: "calendar",
          label: "New Event",
          onPress: () => navigation.navigate("Events", { screen: "EventForm" }),
        },
        {
          icon: "check-circle",
          label: "New Poll",
          onPress: () => navigation.navigate("Voting", { screen: "PollForm" }),
        },
        {
          icon: "credit-card",
          label: "Record Pay",
          onPress: () =>
            navigation.navigate("Finance", { screen: "RecordPayment" }),
        },
        {
          icon: "book-open",
          label: "Library",
          onPress: () => navigation.navigate("Library"),
        },
        {
          icon: "upload",
          label: "Upload Doc",
          onPress: () => navigation.navigate("DocumentForm"),
        },
      ]
    : [
        {
          icon: "calendar",
          label: "Events",
          onPress: () => openTabRoot(navigation, "Events"),
        },
        {
          icon: "check-circle",
          label: "Vote",
          onPress: () => openTabRoot(navigation, "Voting"),
        },
        {
          icon: "users",
          label: "Members",
          onPress: () => navigation.navigate("MembersList"),
        },
        {
          icon: "credit-card",
          label: "My Ledger",
          onPress: () => navigation.navigate("Finance", { screen: "MyLedger" }),
        },
        {
          icon: "shopping-bag",
          label: "Marketplace",
          onPress: () => openTabRoot(navigation, "Market"),
        },
        {
          icon: "book-open",
          label: "Library",
          onPress: () => navigation.navigate("Library"),
        },
      ];
