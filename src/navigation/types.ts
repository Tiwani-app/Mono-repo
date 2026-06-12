import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  RequestJoin: undefined;
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string };
  EventForm: { eventId?: string } | undefined;
  EventCheckIn: { eventId: string };
};

export type VotingStackParamList = {
  VotingHub: undefined;
  PollVote: { pollId: string };
  ElectionBallot: { electionId: string };
  PollForm: { pollId?: string } | undefined;
  ElectionForm: { electionId?: string } | undefined;
  ElectionResults: { electionId: string };
};

export type FinanceStackParamList = {
  FinanceAdmin: undefined;
  MyLedger: { memberId?: string } | undefined;
  DuesPeriodForm: { duesPeriodId?: string } | undefined;
  RecordPayment: { memberId?: string } | undefined;
  AdHocCharge: { memberId?: string } | undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Notifications: undefined;
  AnnouncementForm: undefined;
  Settings: undefined;
  AccountDeletion: undefined;
  MembersList: undefined;
  MemberProfile: { memberId: string };
  MemberForm: { memberId?: string } | undefined;
  JoinRequests: undefined;
  Library: undefined;
  LibraryCategory: { category: "constitutional" | "minutes_reports" };
  DocumentViewer: { documentId: string };
  LibraryManage: undefined;
  DocumentForm: { documentId?: string } | undefined;
};

export type MarketStackParamList = {
  Marketplace: undefined;
  ListingForm: { listingId?: string } | undefined;
};

export type AppTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Voting: NavigatorScreenParams<VotingStackParamList>;
  Finance: NavigatorScreenParams<FinanceStackParamList>;
  Market: NavigatorScreenParams<MarketStackParamList>;
};
