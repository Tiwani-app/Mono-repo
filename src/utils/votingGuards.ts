import { Election } from "../types/voting";
import { User } from "../types/user";

export const isElectionBallotComplete = (
  election: Election,
  choices: Record<string, string>,
) => election.races.every((race) => Boolean(choices[race.raceId]));

const normalizeName = (value: string) => value.trim().toLowerCase();

export const canStandForElection = (member: Pick<User, "financialStatus">) =>
  member.financialStatus === "green";

export const findFinanciallyBlockedCandidateNames = (
  candidateNames: string[],
  members: Pick<User, "fullName" | "financialStatus">[],
) => {
  const membersByName = new Map(
    members.map(member => [normalizeName(member.fullName), member]),
  );

  return candidateNames.filter(candidateName => {
    const member = membersByName.get(normalizeName(candidateName));
    return member ? !canStandForElection(member) : false;
  });
};
