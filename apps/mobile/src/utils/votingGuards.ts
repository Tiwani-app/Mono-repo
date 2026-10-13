import { Election } from "../types/voting";
import { User } from "../types/user";
import { canViewElectionResults } from "./roleGuard";
import { isVotingItemExpired } from "./votingExpiry";

export const isElectionBallotComplete = (
  election: Election,
  choices: Record<string, string>,
) => election.races.every((race) => Boolean(choices[race.raceId]));

const normalizeName = (value: string) => value.trim().toLowerCase();

export const canStandForElection = (
  member: Pick<User, "financialStatus" | "outstandingBalance">,
) => member.financialStatus === "green" && member.outstandingBalance <= 0;

export const findFinanciallyBlockedCandidateNames = (
  candidateNames: string[],
  members: Pick<User, "fullName" | "financialStatus" | "outstandingBalance">[],
) => {
  const membersByName = new Map(
    members.map(member => [normalizeName(member.fullName), member]),
  );

  return candidateNames.filter(candidateName => {
    const member = membersByName.get(normalizeName(candidateName));
    return member ? !canStandForElection(member) : false;
  });
};

// Admins and the electoral chairman see results any time. Members see them only
// once the election has finished (closed, or past its end time) and results
// aren't admin-only. Mirrors memberCanSeeElectionResults in the backend's
// generateElectionResults, which enforces the same rule.
export const canSeeElectionResults = (
  user: User | null,
  election: Pick<Election, "status" | "expiresAt" | "resultVisibility">,
  now = new Date(),
): boolean =>
  canViewElectionResults(user) ||
  (election.resultVisibility === "after_close" &&
    (election.status === "closed" || isVotingItemExpired(election, now)));
