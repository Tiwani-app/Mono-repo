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
    target: {route: "event_detail", eventId: "event-1"},
  },
  {
    id: "notif-2",
    type: "vote",
    title: "Vote",
    body: "Vote body",
    sentAt: new Date("2026-05-11"),
    target: {route: "poll_vote", pollId: "poll-1"},
  },
  {
    id: "notif-3",
    type: "finance",
    title: "Finance",
    body: "Finance body",
    sentAt: new Date("2026-05-10"),
    target: {route: "my_ledger", memberId: "member-1"},
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
  notificationPreferences: {events: true, finance: true, voting: false},
  currencySymbol: "₦",
  timezone: "WAT",
};

describe("notification helpers", () => {
  it("groups unread notifications before earlier read notifications", () => {
    const sections = getNotificationSections(notifications, ["notif-2"]);

    expect(sections.map(section => section.title)).toEqual(["New", "Earlier"]);
    expect(sections[0].data.map(item => item.id)).toEqual(["notif-1", "notif-3"]);
    expect(sections[1].data.map(item => item.id)).toEqual(["notif-2"]);
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
    const navigation = {navigate: jest.fn()};

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
    navigateToNotificationTarget(navigation, {route: "marketplace"});
    navigateToNotificationTarget(navigation, {route: "library"});
    navigateToNotificationTarget(navigation);

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, "Events", {
      screen: "EventDetail",
      params: {eventId: "event-1"},
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, "Voting", {
      screen: "PollVote",
      params: {pollId: "poll-1"},
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, "Voting", {
      screen: "ElectionBallot",
      params: {electionId: "election-1"},
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, "Finance", {
      screen: "MyLedger",
      params: {memberId: "member-1"},
    });
    expect(navigation.navigate).toHaveBeenNthCalledWith(5, "Market");
    expect(navigation.navigate).toHaveBeenNthCalledWith(6, "Library");
    expect(navigation.navigate).toHaveBeenCalledTimes(6);
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
      buildNotificationPreferences(user.notificationPreferences, "voting", true),
    ).toEqual({
      events: true,
      finance: true,
      voting: true,
    });
  });
});
