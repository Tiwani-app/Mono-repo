import { Election } from "../types/voting";

export const isElectionBallotComplete = (
  election: Election,
  choices: Record<string, string>,
) => election.races.every((race) => Boolean(choices[race.raceId]));
