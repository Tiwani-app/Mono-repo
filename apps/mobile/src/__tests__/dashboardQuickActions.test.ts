import { getDashboardQuickActions } from "../screens/dashboardQuickActions";

const labelsFor = (admin: boolean) =>
  getDashboardQuickActions(admin, { navigate: jest.fn() }).map(
    (action) => action.label,
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
      "Members",
      "My Ledger",
      "Marketplace",
      "Library",
    ]);
  });

  it("routes admin quick actions to their workflow screens", () => {
    const navigation = { navigate: jest.fn() };
    const actions = getDashboardQuickActions(true, navigation);

    actions.forEach((action) => action.onPress());

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
    const parentNavigation = { dispatch: jest.fn() };
    const navigation = {
      getParent: jest.fn(() => parentNavigation),
      navigate: jest.fn(),
    };
    const actions = getDashboardQuickActions(false, navigation);

    actions.forEach((action) => action.onPress());

    expect(parentNavigation.dispatch).toHaveBeenCalledTimes(3);
    expect(parentNavigation.dispatch.mock.calls[0][0]).toMatchObject({
      payload: { index: 1 },
      type: "RESET",
    });
    expect(parentNavigation.dispatch.mock.calls[1][0]).toMatchObject({
      payload: { index: 2 },
      type: "RESET",
    });
    expect(parentNavigation.dispatch.mock.calls[2][0]).toMatchObject({
      payload: { index: 4 },
      type: "RESET",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "MembersList");
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Finance", {
      screen: "MyLedger",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Library");
    expect(navigation.navigate).toHaveBeenCalledTimes(3);
  });

  it("falls back to nested tab root navigation without a parent navigator", () => {
    const navigation = { navigate: jest.fn() };
    const actions = getDashboardQuickActions(false, navigation);

    actions[0].onPress();
    actions[1].onPress();
    actions[4].onPress();

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "Events", {
      screen: "EventsList",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Voting", {
      screen: "VotingHub",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Market", {
      screen: "Marketplace",
    });
  });
});
