import { TAB_ROOT_ROUTES } from "../navigation/tabRoutes";
import { safeGoBack } from "../utils/navigation";

describe("navigation behavior", () => {
  it("maps every bottom tab to its root screen", () => {
    expect(TAB_ROOT_ROUTES).toEqual({
      Dashboard: { screen: "DashboardHome" },
      Events: { screen: "EventsList" },
      Voting: { screen: "VotingHub" },
      Finance: { screen: "FinanceAdmin" },
      Market: { screen: "Marketplace" },
    });
  });

  it("goes back when navigation history exists", () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    safeGoBack(navigation, "EventsList");

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("uses fallback route when no history exists", () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    safeGoBack(navigation, "VotingHub", { pollId: "poll-1" });

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("VotingHub", {
      pollId: "poll-1",
    });
  });
});
