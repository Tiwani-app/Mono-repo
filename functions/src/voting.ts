import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";
import { stringField } from "./validation";

interface RaceResult {
  raceId: string;
  office: string;
  candidates: { name: string; voteCount: number }[];
}

const electionRoles = ["admin", "electoral_chairman"] as const;

const recordFromData = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" ? (data as Record<string, unknown>) : {};

const choicesField = (data: unknown): Record<string, string> => {
  const choices = recordFromData(data).choices;
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) {
    throw new HttpsError("invalid-argument", "Field \"choices\" must be an object.");
  }
  return Object.entries(choices as Record<string, unknown>).reduce(
    (values, [raceId, candidate]) => {
      if (typeof candidate === "string" && raceId.trim() && candidate.trim()) {
        values[raceId.trim()] = candidate.trim();
      }
      return values;
    },
    {} as Record<string, string>,
  );
};

const requireVotingAdmin = (request: Parameters<typeof requireActiveUser>[0]) =>
  requireActiveUser(request, [...electionRoles]);

const pollRef = (pollId: string) => db.collection("polls").doc(pollId);
const electionRef = (electionId: string) =>
  db.collection("elections").doc(electionId);

const assertVotingRecord = (
  user: AuthenticatedUser,
  snapshot: FirebaseFirestore.DocumentSnapshot,
  missingMessage: string,
) => {
  if (!snapshot.exists) {
    throw new HttpsError("not-found", missingMessage);
  }
  const record = snapshot.data() ?? {};
  assertSameOrg(user, record.orgId);
  return record;
};

const buildResultRows = (election: FirebaseFirestore.DocumentData): RaceResult[] => {
  const races = Array.isArray(election.races) ? election.races : [];
  return races.map((race, raceIndex) => {
    const raceRecord =
      race && typeof race === "object" ? (race as Record<string, unknown>) : {};
    const candidates = Array.isArray(raceRecord.candidates)
      ? raceRecord.candidates
      : [];
    return {
      raceId:
        typeof raceRecord.raceId === "string" && raceRecord.raceId.trim()
          ? raceRecord.raceId.trim()
          : `race-${raceIndex + 1}`,
      office:
        typeof raceRecord.title === "string" && raceRecord.title.trim()
          ? raceRecord.title.trim()
          : `Race ${raceIndex + 1}`,
      candidates: candidates.map((candidate) => {
        const candidateRecord =
          candidate && typeof candidate === "object"
            ? (candidate as Record<string, unknown>)
            : {};
        return {
          name:
            typeof candidateRecord.name === "string"
              ? candidateRecord.name.trim()
              : "",
          voteCount:
            typeof candidateRecord.voteCount === "number"
              ? candidateRecord.voteCount
              : 0,
        };
      }),
    };
  });
};

const assertElectionCompleteChoices = (
  election: FirebaseFirestore.DocumentData,
  choices: Record<string, string>,
  currentResults: RaceResult[],
) => {
  const races = Array.isArray(election.races) ? election.races : [];
  if (races.length === 0) {
    throw new HttpsError("failed-precondition", "Election has no races.");
  }
  const nextResults = currentResults.map((race) => ({
    ...race,
    candidates: race.candidates.map((candidate) => ({ ...candidate })),
  }));
  races.forEach((race, raceIndex) => {
    const raceRecord =
      race && typeof race === "object" ? (race as Record<string, unknown>) : {};
    const raceId =
      typeof raceRecord.raceId === "string" && raceRecord.raceId.trim()
        ? raceRecord.raceId.trim()
        : `race-${raceIndex + 1}`;
    const choice = choices[raceId];
    if (!choice) {
      throw new HttpsError("invalid-argument", "Select a candidate for every race.");
    }
    const candidates = Array.isArray(raceRecord.candidates)
      ? raceRecord.candidates
      : [];
    const matchingCandidate = candidates.find((candidate) => {
      const candidateRecord =
        candidate && typeof candidate === "object"
          ? (candidate as Record<string, unknown>)
          : {};
      return (
        candidateRecord.uid === choice ||
        (typeof candidateRecord.name === "string" &&
          candidateRecord.name.trim() === choice)
      );
    });
    if (!matchingCandidate) {
      throw new HttpsError("invalid-argument", "Selected candidate is not on this ballot.");
    }
    const candidateRecord = matchingCandidate as Record<string, unknown>;
    const candidateName =
      typeof candidateRecord.name === "string" ? candidateRecord.name.trim() : "";
    const resultRace =
      nextResults.find((result) => result.raceId === raceId) ??
      nextResults[raceIndex];
    const resultCandidate = resultRace?.candidates.find(
      (candidate) => candidate.name === candidateName,
    );
    if (resultCandidate) {
      resultCandidate.voteCount += 1;
    }
  });
  return nextResults;
};

export const openPoll = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const pollId = stringField(request.data, "pollId", { maxLength: 160 });
  const ref = pollRef(pollId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const poll = assertVotingRecord(user, snapshot, "Poll not found.");
    if (poll.status !== "draft") {
      throw new HttpsError("failed-precondition", "Only draft polls can be opened.");
    }
    transaction.update(ref, {
      status: "open",
      openedAt: FieldValue.serverTimestamp(),
      openedBy: user.uid,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "poll.opened",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { pollId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, pollId };
});

export const closePoll = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const pollId = stringField(request.data, "pollId", { maxLength: 160 });
  const ref = pollRef(pollId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const poll = assertVotingRecord(user, snapshot, "Poll not found.");
    if (poll.status !== "open") {
      throw new HttpsError("failed-precondition", "Only open polls can be closed.");
    }
    transaction.update(ref, {
      status: "closed",
      closedAt: FieldValue.serverTimestamp(),
      closedBy: user.uid,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "poll.closed",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { pollId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, pollId };
});

export const castPollVote = onCall(async (request) => {
  const user = await requireActiveUser(request);
  const pollId = stringField(request.data, "pollId", { maxLength: 160 });
  const optionId = stringField(request.data, "optionId", { maxLength: 160 });
  const ref = pollRef(pollId);
  const voteRef = ref.collection("votes").doc(user.uid);

  await db.runTransaction(async (transaction) => {
    const [pollSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(voteRef),
    ]);
    const poll = assertVotingRecord(user, pollSnapshot, "Poll not found.");
    if (poll.status !== "open") {
      throw new HttpsError("failed-precondition", "This poll is not open.");
    }
    if (voteSnapshot.exists) {
      throw new HttpsError("already-exists", "You have already voted in this poll.");
    }
    const options = Array.isArray(poll.options) ? poll.options : [];
    let optionFound = false;
    const nextOptions = options.map((option) => {
      const optionRecord =
        option && typeof option === "object"
          ? (option as Record<string, unknown>)
          : {};
      if (optionRecord.optionId !== optionId) {
        return optionRecord;
      }
      optionFound = true;
      return {
        ...optionRecord,
        voteCount:
          (typeof optionRecord.voteCount === "number"
            ? optionRecord.voteCount
            : 0) + 1,
      };
    });
    if (!optionFound) {
      throw new HttpsError("invalid-argument", "Poll option not found.");
    }
    transaction.update(ref, {
      options: nextOptions,
      totalVotes: FieldValue.increment(1),
    });
    transaction.set(voteRef, {
      pollId,
      optionId,
      orgId: user.profile.orgId,
      uid: user.uid,
      votedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, pollId };
});

export const openElection = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const ref = electionRef(electionId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const election = assertVotingRecord(user, snapshot, "Election not found.");
    if (election.status !== "draft") {
      throw new HttpsError("failed-precondition", "Only draft elections can be opened.");
    }
    transaction.update(ref, {
      status: "open",
      openedAt: FieldValue.serverTimestamp(),
      openedBy: user.uid,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "election.opened",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { electionId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { electionId, ok: true };
});

export const closeElection = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const ref = electionRef(electionId);
  const resultsRef = db.collection("election_results").doc(electionId);

  await db.runTransaction(async (transaction) => {
    const [electionSnapshot, resultsSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(resultsRef),
    ]);
    const election = assertVotingRecord(user, electionSnapshot, "Election not found.");
    if (election.status !== "open") {
      throw new HttpsError("failed-precondition", "Only open elections can be closed.");
    }
    if (!resultsSnapshot.exists) {
      transaction.set(resultsRef, {
        electionId,
        orgId: user.profile.orgId,
        races: buildResultRows(election),
        generatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.update(ref, {
      status: "closed",
      closedAt: FieldValue.serverTimestamp(),
      closedBy: user.uid,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "election.closed",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { electionId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { electionId, ok: true };
});

export const castElectionBallot = onCall(async (request) => {
  const user = await requireActiveUser(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const choices = choicesField(request.data);
  const ref = electionRef(electionId);
  const registryRef = ref.collection("voterRegistry").doc(user.uid);
  const resultsRef = db.collection("election_results").doc(electionId);
  const receipt = `${electionId}-${user.uid}-${Date.now()}`;

  await db.runTransaction(async (transaction) => {
    const [electionSnapshot, registrySnapshot, resultsSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(registryRef),
      transaction.get(resultsRef),
    ]);
    const election = assertVotingRecord(user, electionSnapshot, "Election not found.");
    if (election.status !== "open") {
      throw new HttpsError("failed-precondition", "This election is not open.");
    }
    if (registrySnapshot.exists) {
      throw new HttpsError("already-exists", "You have already voted in this election.");
    }
    const baseResults = resultsSnapshot.exists
      ? resultsSnapshot.data()?.races ?? buildResultRows(election)
      : buildResultRows(election);
    const existingRows = Array.isArray(baseResults)
      ? (baseResults as RaceResult[])
      : buildResultRows(election);
    const nextResults = assertElectionCompleteChoices(
      election,
      choices,
      existingRows,
    );
    const mergedResults = existingRows.map((race) => {
      const nextRace = nextResults.find((result) => result.raceId === race.raceId);
      return nextRace ?? race;
    });
    transaction.set(
      resultsRef,
      {
        electionId,
        orgId: user.profile.orgId,
        races: mergedResults,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(registryRef, {
      ballotReceipt: receipt,
      electionId,
      orgId: user.profile.orgId,
      uid: user.uid,
      votedAt: FieldValue.serverTimestamp(),
      ...(election.ballotType === "open" ? { choices } : {}),
    });
  });

  return { ballotReceipt: receipt, electionId, ok: true };
});

export const generateElectionResults = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const ref = electionRef(electionId);
  const resultsRef = db.collection("election_results").doc(electionId);
  const [electionSnapshot, resultsSnapshot] = await Promise.all([
    ref.get(),
    resultsRef.get(),
  ]);
  const election = assertVotingRecord(user, electionSnapshot, "Election not found.");
  const races = resultsSnapshot.exists
    ? resultsSnapshot.data()?.races ?? buildResultRows(election)
    : buildResultRows(election);
  if (!resultsSnapshot.exists) {
    await resultsRef.set({
      electionId,
      orgId: user.profile.orgId,
      races,
      generatedAt: FieldValue.serverTimestamp(),
    });
  }
  return { electionId, ok: true, races };
});

export const publishElectionResults = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const ref = electionRef(electionId);
  const resultsRef = db.collection("election_results").doc(electionId);
  const [electionSnapshot, resultsSnapshot] = await Promise.all([
    ref.get(),
    resultsRef.get(),
  ]);
  const election = assertVotingRecord(user, electionSnapshot, "Election not found.");
  if (election.status !== "closed") {
    throw new HttpsError("failed-precondition", "Close the election before publishing results.");
  }
  const races = resultsSnapshot.exists
    ? resultsSnapshot.data()?.races ?? buildResultRows(election)
    : buildResultRows(election);
  await Promise.all([
    ref.update({
      resultVisibility: "after_close",
      resultsPublishedAt: FieldValue.serverTimestamp(),
      resultsPublishedBy: user.uid,
    }),
    resultsRef.set(
      {
        electionId,
        orgId: user.profile.orgId,
        races,
        publishedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
  return { electionId, ok: true, races };
});
