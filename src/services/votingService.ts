import {
  Election,
  ElectionVoterReceipt,
  ElectionVoterState,
  Poll,
  PollVoterState,
  Race,
} from "../types/voting";
import {
  castElectionBallotCallable,
  castPollVoteCallable,
  closeElectionCallable,
  closePollCallable,
  createElectionCallable,
  createPollCallable,
  generateElectionResultsCallable,
  listElectionVoterReceiptsCallable,
  updateElectionCallable,
  updatePollCallable,
} from "./cloudFunctionsService";
import {
  electionFromRecord,
  pollFromRecord,
} from "./converters/votingConverter";
import {
  firestore,
  getCurrentOrgId,
  snapshotRecords,
  startOrgSubscription,
} from "./firebaseHelpers";

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
    candidates: {
      name: string;
      manifestoLine: string;
      photoURL?: string | null;
      uid?: string | null;
    }[];
  }[];
}

export interface RaceResult {
  raceId: string;
  office: string;
  candidates: { name: string; voteCount: number }[];
}

export interface ElectionVoterReceiptPayload {
  ballotReceipt: string;
  email: string;
  fullName: string;
  uid: string;
  votedAt: string | null;
}

const voterReceiptFromPayload = (
  receipt: ElectionVoterReceiptPayload,
): ElectionVoterReceipt => ({
  ballotReceipt: receipt.ballotReceipt,
  email: receipt.email,
  fullName: receipt.fullName,
  uid: receipt.uid,
  votedAt: receipt.votedAt ? new Date(receipt.votedAt) : null,
});

const slug = (value: string, fallback: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const resolveRaces = async (data: ElectionInput): Promise<Race[]> => {
  const memberSnapshot = await firestore()
    .collection("users")
    .where("orgId", "==", await getCurrentOrgId())
    .where("status", "==", "active")
    .get();
  const members = snapshotRecords(memberSnapshot);

  return data.races.map((race, raceIndex) => ({
    raceId: slug(race.office, `race-${raceIndex + 1}`),
    office: race.office.trim(),
    candidates: race.candidates.map((candidate) => {
      const member = members.find(
        (item) =>
          typeof item.fullName === "string" &&
          item.fullName.trim().toLowerCase() === candidate.name.trim().toLowerCase(),
      );
      if (!member) {
        throw new Error(
          `Candidate "${candidate.name}" must match an active member name.`,
        );
      }
      return {
        uid: String(member.id),
        name: String(member.fullName),
        manifestoLine: candidate.manifestoLine.trim(),
        photoURL: typeof member.photoURL === "string" ? member.photoURL : null,
      };
    }),
  }));
};

const electionCallablePayload = async (
  data: ElectionInput,
): Promise<ElectionInput> => {
  const races = await resolveRaces(data);
  return {
    title: data.title,
    ballotType: data.ballotType,
    status: data.status,
    races: races.map((race) => ({
      office: race.office,
      candidates: race.candidates.map((candidate) => ({
        uid: candidate.uid,
        name: candidate.name,
        manifestoLine: candidate.manifestoLine,
        photoURL: candidate.photoURL,
      })),
    })),
  };
};

export const subscribeToPolls = (
  callback: (polls: Poll[]) => void,
  onError?: (error: Error) => void,
  options: { includeDrafts?: boolean } = {},
) =>
  startOrgSubscription(
    "polls",
    pollFromRecord,
    callback,
    options.includeDrafts
      ? undefined
      : (query) => query.where("status", "in", ["open", "closed"]),
    onError,
  );

export const subscribeToElections = (
  callback: (elections: Election[]) => void,
  onError?: (error: Error) => void,
  options: { includeDrafts?: boolean } = {},
) =>
  startOrgSubscription(
    "elections",
    electionFromRecord,
    callback,
    options.includeDrafts
      ? undefined
      : (query) => query.where("status", "in", ["open", "closed"]),
    onError,
  );

export const getPoll = async (pollId: string): Promise<Poll> => {
  const snapshot = await firestore().collection("polls").doc(pollId).get();
  if (!snapshot.exists()) {
    throw new Error("Poll not found.");
  }
  return pollFromRecord({ id: snapshot.id, ...(snapshot.data() ?? {}) });
};

export const getElection = async (electionId: string): Promise<Election> => {
  const snapshot = await firestore().collection("elections").doc(electionId).get();
  if (!snapshot.exists()) {
    throw new Error("Election not found.");
  }
  return electionFromRecord({ id: snapshot.id, ...(snapshot.data() ?? {}) });
};

export const createPoll = async (data: PollInput): Promise<Poll> => {
  if (data.status === "closed") {
    throw new Error("Create the poll as draft or open, then close it from the voting hub.");
  }
  const result = await createPollCallable(data);
  return getPoll(result.pollId);
};

export const updatePoll = async (
  pollId: string,
  data: PollInput,
): Promise<void> => {
  await updatePollCallable(pollId, data);
};

export const closePoll = async (pollId: string): Promise<void> => {
  await closePollCallable(pollId);
};

export const createElection = async (
  data: ElectionInput,
): Promise<Election> => {
  if (data.status === "closed") {
    throw new Error("Create the election as draft or open, then close it from the voting hub.");
  }
  const result = await createElectionCallable(await electionCallablePayload(data));
  return getElection(result.electionId);
};

export const updateElection = async (
  electionId: string,
  data: ElectionInput,
): Promise<void> => {
  await updateElectionCallable(electionId, await electionCallablePayload(data));
};

export const closeElection = async (electionId: string): Promise<void> => {
  await closeElectionCallable(electionId);
};

export const getElectionResults = async (
  electionId: string,
): Promise<RaceResult[]> => {
  const result = await generateElectionResultsCallable(electionId);
  return result.races;
};

export const getElectionVoterReceipts = async (
  electionId: string,
): Promise<ElectionVoterReceipt[]> => {
  const result = await listElectionVoterReceiptsCallable(electionId);
  return result.receipts.map(voterReceiptFromPayload);
};

export const hasCastPollVote = async (
  pollId: string,
  userId: string,
): Promise<boolean> => {
  const snapshot = await firestore()
    .collection("polls")
    .doc(pollId)
    .collection("votes")
    .doc(userId)
    .get();
  return snapshot.exists();
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

export const getElectionVoteRecord = async (
  electionId: string,
  userId: string,
): Promise<{ ballotReceipt: string | null; hasVoted: boolean }> => {
  const snapshot = await firestore()
    .collection("elections")
    .doc(electionId)
    .collection("voterRegistry")
    .doc(userId)
    .get();
  if (!snapshot.exists()) {
    return { ballotReceipt: null, hasVoted: false };
  }
  const record = snapshot.data() ?? {};
  return {
    ballotReceipt:
      typeof record.ballotReceipt === "string" && record.ballotReceipt.trim()
        ? record.ballotReceipt
        : null,
    hasVoted: true,
  };
};

export const getElectionVoterState = async (
  electionId: string,
  userId: string,
): Promise<ElectionVoterState> => {
  const [election, voteRecord] = await Promise.all([
    getElection(electionId),
    getElectionVoteRecord(electionId, userId),
  ]);
  return {
    hasVoted: voteRecord.hasVoted,
    ballotReceipt: voteRecord.ballotReceipt,
    resultsVisible:
      election.status === "closed" &&
      election.resultVisibility === "after_close",
  };
};

export const castPollVote = async (
  pollId: string,
  optionId: string,
  _userId: string,
): Promise<void> => {
  await castPollVoteCallable(pollId, optionId);
};

export const castElectionBallot = async (
  electionId: string,
  choices: Record<string, string>,
  _userId: string,
): Promise<string> => {
  const result = await castElectionBallotCallable(electionId, choices);
  return result.ballotReceipt;
};
