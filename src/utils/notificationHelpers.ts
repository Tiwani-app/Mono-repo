import { NotificationTarget, TiwaniNotification } from "../types/notification";
import { getTabRootResetState } from "../navigation/tabRoutes";

export interface NotificationSection {
  title: "New" | "Earlier";
  data: TiwaniNotification[];
}

export const getNotificationSections = (
  notifications: TiwaniNotification[],
  readIds: string[],
): NotificationSection[] => {
  const sortedNotifications = [...notifications].sort(
    (a, b) => b.sentAt.getTime() - a.sentAt.getTime(),
  );
  const unread = sortedNotifications.filter(
    (item) => !readIds.includes(item.id),
  );
  const read = sortedNotifications.filter((item) => readIds.includes(item.id));
  return [
    ...(unread.length > 0 ? [{ title: "New" as const, data: unread }] : []),
    ...(read.length > 0 ? [{ title: "Earlier" as const, data: read }] : []),
  ];
};

export const getNextReadIds = (readIds: string[], id: string) =>
  readIds.includes(id) ? readIds : [...readIds, id];

export const getAllNotificationIds = (notifications: TiwaniNotification[]) =>
  notifications.map((item) => item.id);

export const navigateToNotificationTarget = (
  navigation: {
    dispatch?: (action: object) => void;
    getParent?: () => { dispatch?: (action: object) => void } | undefined;
    navigate: (route: string, params?: object) => void;
  },
  target?: NotificationTarget,
) => {
  if (!target) {
    return;
  }
  if (target.route === "event_detail") {
    navigation.navigate("Events", {
      screen: "EventDetail",
      params: { eventId: target.eventId },
    });
    return;
  }
  if (target.route === "poll_vote") {
    navigation.navigate("Voting", {
      screen: "PollVote",
      params: { pollId: target.pollId },
    });
    return;
  }
  if (target.route === "election_ballot") {
    navigation.navigate("Voting", {
      screen: "ElectionBallot",
      params: { electionId: target.electionId },
    });
    return;
  }
  if (target.route === "my_ledger") {
    navigation.navigate("Finance", {
      screen: "MyLedger",
      params: { memberId: target.memberId },
    });
    return;
  }
  if (target.route === "marketplace") {
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.dispatch) {
      parentNavigation.dispatch({
        type: "RESET",
        payload: getTabRootResetState("Market"),
      });
      return;
    }
    navigation.navigate("Market", { screen: "Marketplace" });
    return;
  }
  if (target.route === "library") {
    navigation.navigate("Library");
  }
};
