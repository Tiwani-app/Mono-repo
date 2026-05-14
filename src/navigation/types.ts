import {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: {eventId: string};
};

export type VotingStackParamList = {
  VotingHub: undefined;
  PollVote: {pollId: string};
  ElectionBallot: {electionId: string};
};

export type FinanceStackParamList = {
  FinanceAdmin: undefined;
  MyLedger: {memberId?: string} | undefined;
};

export type MoreStackParamList = {
  Marketplace: undefined;
  MembersList: undefined;
  MemberProfile: {memberId: string};
  Notifications: undefined;
  Settings: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Voting: NavigatorScreenParams<VotingStackParamList>;
  Finance: NavigatorScreenParams<FinanceStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};
