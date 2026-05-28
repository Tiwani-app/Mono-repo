import { TiwaniNotification } from "../types/notification";
import { User } from "../types/user";
import {
  getAllNotificationIds,
  getNextReadIds,
  getNotificationSections,
  navigateToNotificationTarget,
} from "../utils/notificationHelpers";
import {
  buildNotificationPreferences,
  buildProfileUpdate,
  getPreviousProfile,
} from "../utils/settingsProfile";

const notifications: TiwaniNotification[] = [
  {
    id: "notif-1",
    type: "event",
    title: "Event",
    body: "Event body",
    sentAt: new Date("2026-05-12"),
    target: { route: "event_detail", eventId: "event-1" },
  },
  {
    id: "notif-2",
    type: "vote",
    title: "Vote",
    body: "Vote body",
    sentAt: new Date("2026-05-11"),
    target: { route: "poll_vote", pollId: "poll-1" },
  },
  {
    id: "notif-3",
    type: "finance",
    title: "Finance",
    body: "Finance body",
    sentAt: new Date("2026-05-10"),
    target: { route: "my_ledger", memberId: "member-1" },
  },
];

const user: User = {
  uid: "member-1",
  fullName: "Tiwalade Adebayo",
  email: "member@tiwani.app",
  phone: "08098765432",
  photoURL: "https://example.com/photo.jpg",
  role: "member",
  status: "active",
  financialStatus: "green",
  outstandingBalance: 0,
  address: "8 Unity Avenue",
  maritalStatus: "single",
  dateOfBirth: "",
  spouseName: null,
  spouseDateOfBirth: null,
  weddingAnniversary: null,
  children: [],
  memberSince: "2026-01-01",
  notificationPreferences: { events: true, finance: true, voting: false },
  currencySymbol: "$",
  timezone: "America/New_York",
};

describe("notification helpers", () => {
  it("groups unread notifications before earlier read notifications", () => {
    const sections = getNotificationSections(
      [notifications[2], notifications[1], notifications[0]],
      ["notif-2"],
    );

    expect(sections.map((section) => section.title)).toEqual([
      "New",
      "Earlier",
    ]);
    expect(sections[0].data.map((item) => item.id)).toEqual([
      "notif-1",
      "notif-3",
    ]);
    expect(sections[1].data.map((item) => item.id)).toEqual(["notif-2"]);
  });

  it("builds read ids without duplicates and marks all notifications read", () => {
    expect(getNextReadIds(["notif-1"], "notif-1")).toEqual(["notif-1"]);
    expect(getNextReadIds(["notif-1"], "notif-2")).toEqual([
      "notif-1",
      "notif-2",
    ]);
    expect(getAllNotificationIds(notifications)).toEqual([
      "notif-1",
      "notif-2",
      "notif-3",
    ]);
  });

  it("routes notification targets to the correct stacks", () => {
    const parentNavigation = { dispatch: jest.fn() };
    const navigation = {
      dispatch: jest.fn(),
      getParent: jest.fn(() => parentNavigation),
      navigate: jest.fn(),
    };

    navigateToNotificationTarget(navigation, {
      route: "event_detail",
      eventId: "event-1",
    });
    navigateToNotificationTarget(navigation, {
      route: "poll_vote",
      pollId: "poll-1",
    });
    navigateToNotificationTarget(navigation, {
      route: "election_ballot",
      electionId: "election-1",
    });
    navigateToNotificationTarget(navigation, {
      route: "my_ledger",
      memberId: "member-1",
    });
    navigateToNotificationTarget(navigation, { route: "marketplace" });
    navigateToNotificationTarget(navigation, { route: "library" });
    navigateToNotificationTarget(navigation);

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "Events", {
      screen: "EventDetail",
      params: { eventId: "event-1" },
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Voting", {
      screen: "PollVote",
      params: { pollId: "poll-1" },
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Voting", {
      screen: "ElectionBallot",
      params: { electionId: "election-1" },
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, "Finance", {
      screen: "MyLedger",
      params: { memberId: "member-1" },
    });
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(parentNavigation.dispatch).toHaveBeenCalledTimes(1);
    expect(parentNavigation.dispatch.mock.calls[0][0]).toMatchObject({
      payload: {
        index: 4,
        routes: [
          { name: "Dashboard", state: { routes: [{ name: "DashboardHome" }] } },
          { name: "Events", state: { routes: [{ name: "EventsList" }] } },
          { name: "Voting", state: { routes: [{ name: "VotingHub" }] } },
          { name: "Finance", state: { routes: [{ name: "FinanceAdmin" }] } },
          { name: "Market", state: { routes: [{ name: "Marketplace" }] } },
        ],
      },
      type: "RESET",
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(5, "Library");
    expect(navigation.navigate).toHaveBeenCalledTimes(5);
  });

  it("falls back to nested Marketplace navigation without a parent navigator", () => {
    const navigation = { navigate: jest.fn() };

    navigateToNotificationTarget(navigation, { route: "marketplace" });

    expect(navigation.navigate).toHaveBeenCalledWith("Market", {
      screen: "Marketplace",
    });
  });
});

describe("settings helpers", () => {
  it("trims profile updates and converts blank photo URLs to null", () => {
    expect(
      buildProfileUpdate({
        fullName: "  Ada Member  ",
        phone: " 08012345678 ",
        address: " Lagos ",
        photoURL: "   ",
      }),
    ).toEqual({
      fullName: "Ada Member",
      phone: "08012345678",
      address: "Lagos",
      photoURL: null,
    });
  });

  it("captures rollback profile values and builds preference updates", () => {
    expect(getPreviousProfile(user)).toEqual({
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      photoURL: user.photoURL,
    });
    expect(
      buildNotificationPreferences(
        user.notificationPreferences,
        "voting",
        true,
      ),
    ).toEqual({
      events: true,
      finance: true,
      voting: true,
    });
  });
});
