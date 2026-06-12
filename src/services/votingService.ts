import {
  Election,
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
  generateElectionResultsCallable,
  openElectionCallable,
  openPollCallable,
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
    candidates: { name: string; manifestoLine: string }[];
  }[];
}

export interface RaceResult {
  raceId: string;
  office: string;
  candidates: { name: string; voteCount: number }[];
}

const slug = (value: string, fallback: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const pollOptions = (labels: string[], current?: Poll) =>
  labels.map((label, index) => {
    const existing = current?.options.find((option) => option.label === label);
    return {
      optionId: existing?.id ?? slug(label, `option-${index + 1}`),
      label: label.trim(),
      imageURL: existing?.imageURL ?? null,
      voteCount: existing?.voteCount ?? 0,
    };
  });

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

const storedRaces = (races: Race[]) =>
  races.map((race) => ({
    raceId: race.raceId,
    title: race.office,
    candidates: race.candidates.map((candidate) => ({
      uid: candidate.uid,
      name: candidate.name,
      manifesto: candidate.manifestoLine,
      photoURL: candidate.photoURL,
    })),
  }));

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
  const ref = firestore().collection("polls").doc();
  const shouldOpenWithCallable = data.status === "open";
  await ref.set({
    pollId: ref.id,
    orgId: await getCurrentOrgId(),
    title: data.title.trim(),
    question: data.question.trim(),
    status: shouldOpenWithCallable ? "draft" : data.status,
    resultVisibility: "after_vote",
    totalVotes: 0,
    options: pollOptions(data.options),
  });
  if (shouldOpenWithCallable) {
    await openPollCallable(ref.id);
  }
  return getPoll(ref.id);
};

export const updatePoll = async (
  pollId: string,
  data: Partial<PollInput>,
): Promise<void> => {
  const current = await getPoll(pollId);
  if (data.status === "closed" && current.status === "open") {
    await closePoll(pollId);
    return;
  }
  if (current.status !== "draft") {
    throw new Error("Only draft polls can be edited. Close open polls from the voting hub.");
  }
  if (data.status === "closed") {
    throw new Error("Open this poll before closing it from the voting hub.");
  }
  const shouldOpenWithCallable =
    data.status === "open" && current.status === "draft";
  await firestore()
    .collection("polls")
    .doc(pollId)
    .update({
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.question !== undefined ? { question: data.question.trim() } : {}),
      ...(data.status !== undefined && !shouldOpenWithCallable
        ? { status: data.status }
        : {}),
      ...(data.options !== undefined
        ? { options: pollOptions(data.options, current) }
        : {}),
    });
  if (shouldOpenWithCallable) {
    await openPollCallable(pollId);
  }
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
  const ref = firestore().collection("elections").doc();
  const shouldOpenWithCallable = data.status === "open";
  await ref.set({
    electionId: ref.id,
    orgId: await getCurrentOrgId(),
    title: data.title.trim(),
    ballotType: data.ballotType,
    status: shouldOpenWithCallable ? "draft" : data.status,
    resultVisibility: "after_close",
    races: storedRaces(await resolveRaces(data)),
  });
  if (shouldOpenWithCallable) {
    await openElectionCallable(ref.id);
  }
  return getElection(ref.id);
};

export const updateElection = async (
  electionId: string,
  data: Partial<ElectionInput>,
): Promise<void> => {
  const current = await getElection(electionId);
  if (data.status === "closed" && current.status === "open") {
    await closeElection(electionId);
    return;
  }
  if (current.status !== "draft") {
    throw new Error("Only draft elections can be edited. Close open elections from the voting hub.");
  }
  if (data.status === "closed") {
    throw new Error("Open this election before closing it from the voting hub.");
  }
  const shouldOpenWithCallable =
    data.status === "open" && current.status === "draft";
  await firestore()
    .collection("elections")
    .doc(electionId)
    .update({
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.ballotType !== undefined ? { ballotType: data.ballotType } : {}),
      ...(data.status !== undefined && !shouldOpenWithCallable
        ? { status: data.status }
        : {}),
      ...(data.races !== undefined
        ? { races: storedRaces(await resolveRaces(data as ElectionInput)) }
        : {}),
    });
  if (shouldOpenWithCallable) {
    await openElectionCallable(electionId);
  }
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

export const hasCastElectionVote = async (
  electionId: string,
  userId: string,
): Promise<boolean> => {
  const snapshot = await firestore()
    .collection("elections")
    .doc(electionId)
    .collection("voterRegistry")
    .doc(userId)
    .get();
  return snapshot.exists();
};

export const getElectionVoterState = async (
  electionId: string,
  userId: string,
): Promise<ElectionVoterState> => {
  const [election, hasVoted] = await Promise.all([
    getElection(electionId),
    hasCastElectionVote(electionId, userId),
  ]);
  return {
    hasVoted,
    ballotReceipt: null,
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
): Promise<void> => {
  await castElectionBallotCallable(electionId, choices);
};
