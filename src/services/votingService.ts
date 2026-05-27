import {
  Election,
  ElectionVoterState,
  Poll,
  PollVoterState,
  Race,
} from "../types/voting";
import { delay, mockElections, mockPolls } from "./mockData";

export interface PollInput {
  title: string;
  question: string;
  status: Poll["status"];
  options: string[];
}

export interface ElectionInput {
  title: string;
  ballotType: Election["ballotType"];
  status: Election["status"];
  races: {
    office: string;
    candidates: { name: string; manifestoLine: string }[];
  }[];
}

export interface RaceResult {
  raceId: string;
  office: string;
  candidates: { name: string; voteCount: number }[];
}

let polls = mockPolls.slice();
let elections = mockElections.slice();
const pollSubscribers = new Set<(polls: Poll[]) => void>();
const electionSubscribers = new Set<(elections: Election[]) => void>();
const pollVotes = new Set<string>();
const electionVotes = new Set<string>();
const electionBallots: Record<string, Record<string, string>[]> = {};
const electionReceipts: Record<string, string> = {};
const pollStatuses: Poll["status"][] = ["draft", "open", "closed"];
const electionStatuses: Election["status"][] = ["draft", "open", "closed"];
const ballotTypes: Election["ballotType"][] = ["open", "secret"];

const visiblePolls = () => polls.filter((poll) => poll.status === "open");
const visibleElections = () =>
  elections.filter((election) => election.status === "open");

const emitPolls = () => {
  const snapshot = visiblePolls();
  pollSubscribers.forEach((callback) => callback(snapshot));
};

const emitElections = () => {
  const snapshot = visibleElections();
  electionSubscribers.forEach((callback) => callback(snapshot));
};

const optionIdFromLabel = (label: string, index: number) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `option-${index + 1}`;
};

const raceIdFromOffice = (office: string, index: number) => {
  const slug = office
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `race-${index + 1}`;
};

const uniqueTrimmed = (values: string[]) => {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      return result;
    }
    seen.add(key);
    return [...result, trimmed];
  }, []);
};

const normalizePollInput = (data: PollInput): PollInput => ({
  ...data,
  title: data.title.trim(),
  question: data.question.trim(),
  options: uniqueTrimmed(data.options),
});

const validatePollInput = (data: PollInput) => {
  if (!data.title) {
    throw new Error("Poll title is required.");
  }
  if (!data.question) {
    throw new Error("Poll question is required.");
  }
  if (!pollStatuses.includes(data.status)) {
    throw new Error("Poll status is invalid.");
  }
  if (data.options.length < 2) {
    throw new Error("Polls require at least two unique options.");
  }
};

const normalizeElectionInput = (data: ElectionInput): ElectionInput => ({
  ...data,
  title: data.title.trim(),
  races: data.races.map((race) => ({
    office: race.office.trim(),
    candidates: race.candidates
      .map((candidate) => ({
        name: candidate.name.trim(),
        manifestoLine: candidate.manifestoLine.trim(),
      }))
      .filter((candidate) => candidate.name),
  })),
});

const validateElectionInput = (data: ElectionInput) => {
  if (!data.title) {
    throw new Error("Election title is required.");
  }
  if (!ballotTypes.includes(data.ballotType)) {
    throw new Error("Election ballot type is invalid.");
  }
  if (!electionStatuses.includes(data.status)) {
    throw new Error("Election status is invalid.");
  }
  if (data.races.length === 0) {
    throw new Error("Elections require at least one race.");
  }
  data.races.forEach((race) => {
    if (!race.office) {
      throw new Error("Election office is required.");
    }
    const uniqueCandidates = uniqueTrimmed(
      race.candidates.map((candidate) => candidate.name),
    );
    if (race.candidates.length < 2 || uniqueCandidates.length < 2) {
      throw new Error(
        "Each election race requires at least two unique candidates.",
      );
    }
  });
};

const racesFromInput = (data: ElectionInput): Race[] =>
  data.races.map((race, raceIndex) => ({
    raceId: raceIdFromOffice(race.office, raceIndex),
    office: race.office,
    candidates: race.candidates.map((candidate) => ({
      uid: null,
      name: candidate.name,
      manifestoLine: candidate.manifestoLine,
      photoURL: null,
    })),
  }));

export const subscribeToPolls = (callback: (polls: Poll[]) => void) => {
  pollSubscribers.add(callback);
  callback(visiblePolls());
  return () => {
    pollSubscribers.delete(callback);
  };
};

export const subscribeToElections = (
  callback: (elections: Election[]) => void,
) => {
  electionSubscribers.add(callback);
  callback(visibleElections());
  return () => {
    electionSubscribers.delete(callback);
  };
};

export const getPoll = async (pollId: string): Promise<Poll> => {
  await delay();
  const poll = polls.find((item) => item.id === pollId);
  if (!poll) {
    throw new Error("Poll not found.");
  }
  return poll;
};

export const getElection = async (electionId: string): Promise<Election> => {
  await delay();
  const election = elections.find((item) => item.id === electionId);
  if (!election) {
    throw new Error("Election not found.");
  }
  return election;
};

export const createPoll = async (data: PollInput): Promise<Poll> => {
  await delay();
  const normalized = normalizePollInput(data);
  validatePollInput(normalized);
  const poll: Poll = {
    id: `poll-${Date.now()}`,
    title: normalized.title,
    question: normalized.question,
    status: normalized.status,
    totalVotes: 0,
    resultVisibility: "after_vote",
    options: normalized.options.map((label, index) => ({
      id: optionIdFromLabel(label, index),
      label,
      imageURL: null,
      voteCount: 0,
    })),
  };
  polls = [poll, ...polls];
  emitPolls();
  return poll;
};

export const updatePoll = async (
  pollId: string,
  data: Partial<PollInput>,
): Promise<void> => {
  await delay();
  const existingPoll = polls.find((poll) => poll.id === pollId);
  if (!existingPoll) {
    throw new Error("Poll not found.");
  }
  const normalized = normalizePollInput({
    title: data.title ?? existingPoll.title,
    question: data.question ?? existingPoll.question,
    status: data.status ?? existingPoll.status,
    options: data.options ?? existingPoll.options.map((option) => option.label),
  });
  validatePollInput(normalized);
  polls = polls.map((poll) => {
    if (poll.id !== pollId) {
      return poll;
    }
    const nextOptions = normalized.options
      ? normalized.options.map((label, index) => {
          const existing = poll.options.find(
            (option) => option.label === label,
          );
          return {
            id: existing?.id ?? optionIdFromLabel(label, index),
            label,
            imageURL: existing?.imageURL ?? null,
            voteCount: existing?.voteCount ?? 0,
          };
        })
      : poll.options;
    return {
      ...poll,
      ...normalized,
      options: nextOptions,
      totalVotes: nextOptions.reduce(
        (sum, option) => sum + option.voteCount,
        0,
      ),
    };
  });
  emitPolls();
};

export const closePoll = async (pollId: string): Promise<void> => {
  await updatePoll(pollId, { status: "closed" });
};

export const createElection = async (
  data: ElectionInput,
): Promise<Election> => {
  await delay();
  const normalized = normalizeElectionInput(data);
  validateElectionInput(normalized);
  const election: Election = {
    id: `election-${Date.now()}`,
    title: normalized.title,
    ballotType: normalized.ballotType,
    status: normalized.status,
    resultVisibility: "after_close",
    races: racesFromInput(normalized),
  };
  elections = [election, ...elections];
  emitElections();
  return election;
};

export const updateElection = async (
  electionId: string,
  data: Partial<ElectionInput>,
): Promise<void> => {
  await delay();
  const existingElection = elections.find(
    (election) => election.id === electionId,
  );
  if (!existingElection) {
    throw new Error("Election not found.");
  }
  const normalized = normalizeElectionInput({
    title: data.title ?? existingElection.title,
    ballotType: data.ballotType ?? existingElection.ballotType,
    status: data.status ?? existingElection.status,
    races:
      data.races ??
      existingElection.races.map((race) => ({
        office: race.office,
        candidates: race.candidates.map((candidate) => ({
          name: candidate.name,
          manifestoLine: candidate.manifestoLine,
        })),
      })),
  });
  validateElectionInput(normalized);
  elections = elections.map((election) =>
    election.id === electionId
      ? {
          ...election,
          ...normalized,
          races: racesFromInput(normalized),
        }
      : election,
  );
  emitElections();
};

export const closeElection = async (electionId: string): Promise<void> => {
  await updateElection(electionId, { status: "closed" });
};

export const getElectionResults = async (
  electionId: string,
): Promise<RaceResult[]> => {
  await delay();
  const election = elections.find((item) => item.id === electionId);
  if (!election) {
    throw new Error("Election not found.");
  }
  const ballots = electionBallots[electionId] ?? [];
  return election.races.map((race) => ({
    raceId: race.raceId,
    office: race.office,
    candidates: race.candidates.map((candidate) => ({
      name: candidate.name,
      voteCount: ballots.filter(
        (ballot) => ballot[race.raceId] === candidate.name,
      ).length,
    })),
  }));
};

export const hasCastPollVote = async (
  pollId: string,
  userId: string,
): Promise<boolean> => {
  await delay();
  return pollVotes.has(`${pollId}:${userId}`);
};

export const getPollVoterState = async (
  pollId: string,
  userId: string,
): Promise<PollVoterState> => {
  const [poll, hasVoted] = await Promise.all([
    getPoll(pollId),
    hasCastPollVote(pollId, userId),
  ]);
  return {
    hasVoted,
    resultsVisible:
      poll.status === "closed" ||
      (poll.resultVisibility === "after_vote" && hasVoted),
  };
};

export const hasCastElectionVote = async (
  electionId: string,
  userId: string,
): Promise<boolean> => {
  await delay();
  return electionVotes.has(`${electionId}:${userId}`);
};

export const getElectionVoterState = async (
  electionId: string,
  userId: string,
): Promise<ElectionVoterState> => {
  const [election, hasVoted] = await Promise.all([
    getElection(electionId),
    hasCastElectionVote(electionId, userId),
  ]);
  const voteKey = `${electionId}:${userId}`;
  return {
    hasVoted,
    ballotReceipt: electionReceipts[voteKey] ?? null,
    resultsVisible:
      election.status === "closed" &&
      election.resultVisibility === "after_close",
  };
};

export const castPollVote = async (
  pollId: string,
  optionId: string,
  userId: string,
): Promise<void> => {
  await delay();
  const voteKey = `${pollId}:${userId}`;
  if (pollVotes.has(voteKey)) {
    return;
  }
  const poll = polls.find((item) => item.id === pollId);
  const option = poll?.options.find((item) => item.id === optionId);
  if (!poll || !option) {
    throw new Error("Vote option not found.");
  }
  if (poll.status !== "open") {
    throw new Error("This poll is not open for voting.");
  }
  option.voteCount += 1;
  poll.totalVotes += 1;
  pollVotes.add(voteKey);
  emitPolls();
};

export const castElectionBallot = async (
  electionId: string,
  choices: Record<string, string>,
  userId: string,
): Promise<void> => {
  await delay();
  const voteKey = `${electionId}:${userId}`;
  if (electionVotes.has(voteKey)) {
    return;
  }
  const election = elections.find((item) => item.id === electionId);
  const completeBallot = election?.races.every((race) => choices[race.raceId]);
  if (!election || !completeBallot) {
    throw new Error("Ballot is incomplete.");
  }
  if (election.status !== "open") {
    throw new Error("This election is not open for ballots.");
  }
  const hasInvalidChoice = election.races.some((race) => {
    const selectedCandidate = choices[race.raceId];
    return !race.candidates.some(
      (candidate) => candidate.name === selectedCandidate,
    );
  });
  if (hasInvalidChoice) {
    throw new Error("Ballot contains an invalid candidate.");
  }
  electionBallots[electionId] = [
    ...(electionBallots[electionId] ?? []),
    choices,
  ];
  electionVotes.add(voteKey);
  electionReceipts[voteKey] = `BALLOT-${electionId}-${userId}-${Date.now()}`;
  emitElections();
};
