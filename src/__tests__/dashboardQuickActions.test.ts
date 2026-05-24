import { getDashboardQuickActions } from "../screens/dashboardQuickActions";

const labelsFor = (admin: boolean) =>
  getDashboardQuickActions(admin, { navigate: jest.fn() }).map(
    action => action.label,
  );

describe("dashboard quick actions", () => {
  it("keeps admin actions in the approved two-row order", () => {
    expect(labelsFor(true)).toEqual([
      "Add Member",
      "New Event",
      "New Poll",
      "Record Pay",
      "Library",
      "Upload Doc",
    ]);
  });

  it("keeps member actions in the approved order", () => {
    expect(labelsFor(false)).toEqual([
      "Events",
      "Vote",
      "My Ledger",
      "Marketplace",
      "Library",
    ]);
  });

  it("routes admin quick actions to their workflow screens", () => {
    const navigation = { navigate: jest.fn() };
    const actions = getDashboardQuickActions(true, navigation);

    actions.forEach(action => action.onPress());

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "MemberForm");
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Events", {
      screen: "EventForm",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Voting", {
      screen: "PollForm",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, "Finance", {
      screen: "RecordPayment",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(5, "Library");
    expect(navigation.navigate).toHaveBeenNthCalledWith(6, "DocumentForm");
  });

  it("routes member quick actions to their destination pages", () => {
    const navigation = { navigate: jest.fn() };
    const actions = getDashboardQuickActions(false, navigation);

    actions.forEach(action => action.onPress());

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "Events");
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Voting");
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Finance", {
      screen: "MyLedger",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, "Market");
    expect(navigation.navigate).toHaveBeenNthCalledWith(5, "Library");
  });
});
