export interface DashboardQuickAction {
  icon: string;
  label: string;
  onPress: () => void;
}

interface DashboardNavigation {
  navigate: (route: string, params?: object) => void;
}

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
          onPress: () => navigation.navigate("Events"),
        },
        {
          icon: "check-circle",
          label: "Vote",
          onPress: () => navigation.navigate("Voting"),
        },
        {
          icon: "credit-card",
          label: "My Ledger",
          onPress: () => navigation.navigate("Finance", { screen: "MyLedger" }),
        },
        {
          icon: "shopping-bag",
          label: "Marketplace",
          onPress: () => navigation.navigate("Market"),
        },
        {
          icon: "book-open",
          label: "Library",
          onPress: () => navigation.navigate("Library"),
        },
      ];
