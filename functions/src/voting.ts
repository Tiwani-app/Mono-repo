import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { publishOrgAnnouncement } from "./activityNotifications";
import { assertSameOrg, requireActiveUser } from "./authz";
import { db } from "./firebase";
import { AuthenticatedUser } from "./types";
import { stringField } from "./validation";

interface RaceResult {
  raceId: string;
  office: string;
  candidates: { name: string; voteCount: number }[];
}

interface VoterReceipt {
  ballotReceipt: string;
  email: string;
  fullName: string;
  uid: string;
  votedAt: string | null;
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

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDateMethod = (value as { toDate?: unknown }).toDate;
    if (typeof toDateMethod === "function") {
      const next = toDateMethod.call(value);
      return next instanceof Date && !Number.isNaN(next.getTime()) ? next : null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }
  return null;
};

const expiresAtField = (data: unknown) => {
  const date = toDate(recordFromData(data).expiresAt);
  if (!date) {
    throw new HttpsError("invalid-argument", "Field \"expiresAt\" must be a valid date.");
  }
  return date;
};

const isExpired = (record: FirebaseFirestore.DocumentData) => {
  const expiresAt = toDate(record.expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
};

const assertFutureExpiry = (
  expiresAt: Date,
  entityName: "Election" | "Poll",
) => {
  if (expiresAt.getTime() <= Date.now()) {
    throw new HttpsError(
      "failed-precondition",
      `${entityName} expiry date must be in the future before voting can open.`,
    );
  }
};

const slug = (value: string, fallback: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const stringArrayField = (
  data: unknown,
  field: string,
  options: { minLength?: number; maxLength?: number; itemMaxLength?: number } = {},
) => {
  const value = recordFromData(data)[field];
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be an array.`);
  }
  const values = value.map((item) => {
    if (typeof item !== "string") {
      throw new HttpsError("invalid-argument", `Field "${field}" must contain strings.`);
    }
    const trimmed = item.trim();
    if (!trimmed) {
      throw new HttpsError("invalid-argument", `Field "${field}" cannot contain empty values.`);
    }
    if (options.itemMaxLength && trimmed.length > options.itemMaxLength) {
      throw new HttpsError(
        "invalid-argument",
        `Field "${field}" items must be ${options.itemMaxLength} characters or fewer.`,
      );
    }
    return trimmed;
  });
  const unique = Array.from(new Set(values));
  if (unique.length !== values.length) {
    throw new HttpsError("invalid-argument", `Field "${field}" must contain unique values.`);
  }
  if (options.minLength && unique.length < options.minLength) {
    throw new HttpsError(
      "invalid-argument",
      `Field "${field}" must contain at least ${options.minLength} values.`,
    );
  }
  if (options.maxLength && unique.length > options.maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `Field "${field}" must contain ${options.maxLength} values or fewer.`,
    );
  }
  return unique;
};

const pollStatusField = (data: unknown) => {
  const status = stringField(data, "status", { maxLength: 24 });
  if (status !== "draft" && status !== "open" && status !== "closed") {
    throw new HttpsError("invalid-argument", "Poll status is not supported.");
  }
  return status;
};

const electionStatusField = (data: unknown) => {
  const status = stringField(data, "status", { maxLength: 24 });
  if (status !== "draft" && status !== "open" && status !== "closed") {
    throw new HttpsError("invalid-argument", "Election status is not supported.");
  }
  return status;
};

const ballotTypeField = (data: unknown) => {
  const ballotType = stringField(data, "ballotType", { maxLength: 24 });
  if (ballotType !== "open" && ballotType !== "secret") {
    throw new HttpsError("invalid-argument", "Election ballot type is not supported.");
  }
  return ballotType;
};

const buildPollOptions = (
  labels: string[],
  currentOptions: unknown[] = [],
) =>
  labels.map((label, index) => {
    const existing = currentOptions.find((option) => {
      const record =
        option && typeof option === "object" ? (option as Record<string, unknown>) : {};
      return record.label === label;
    });
    const existingRecord =
      existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
    return {
      optionId:
        typeof existingRecord.optionId === "string" && existingRecord.optionId.trim()
          ? existingRecord.optionId.trim()
          : slug(label, `option-${index + 1}`),
      label,
      imageURL:
        typeof existingRecord.imageURL === "string"
          ? existingRecord.imageURL
          : null,
      voteCount:
        typeof existingRecord.voteCount === "number"
          ? existingRecord.voteCount
          : 0,
    };
  });

const pollOptionLabels = (options: unknown[]) =>
  options.map((option) => {
    const record =
      option && typeof option === "object" ? (option as Record<string, unknown>) : {};
    return typeof record.label === "string" ? record.label.trim() : "";
  });

const labelsChanged = (left: string[], right: string[]) =>
  left.length !== right.length || left.some((value, index) => value !== right[index]);

const raceInputsField = (data: unknown) => {
  const races = recordFromData(data).races;
  if (!Array.isArray(races) || races.length === 0) {
    throw new HttpsError("invalid-argument", "Add at least one election race.");
  }
  return races.map((race, raceIndex) => {
    const raceRecord = recordFromData(race);
    const office = stringField(raceRecord, "office", {
      maxLength: 120,
    });
    const candidates = raceRecord.candidates;
    if (!Array.isArray(candidates) || candidates.length < 2) {
      throw new HttpsError(
        "invalid-argument",
        "Each election race must have at least two candidates.",
      );
    }
    const candidateRows = candidates.map((candidate) => {
      const candidateRecord = recordFromData(candidate);
      const uid = stringField(candidateRecord, "uid", {
        maxLength: 160,
        required: false,
      });
      const name = stringField(candidateRecord, "name", { maxLength: 120 });
      const manifestoLine = stringField(candidateRecord, "manifestoLine", {
        maxLength: 240,
        required: false,
      });
      return {
        uid: uid || null,
        name,
        manifesto: manifestoLine,
        photoURL:
          typeof candidateRecord.photoURL === "string" &&
          candidateRecord.photoURL.trim()
            ? candidateRecord.photoURL.trim()
            : null,
      };
    });
    const uniqueCandidates = new Set(
      candidateRows.map((candidate) => candidate.uid ?? candidate.name),
    );
    if (uniqueCandidates.size !== candidateRows.length) {
      throw new HttpsError("invalid-argument", "Election candidates must be unique.");
    }
    return {
      raceId: slug(office, `race-${raceIndex + 1}`),
      title: office,
      candidates: candidateRows,
    };
  });
};

const racesChanged = (left: unknown[], right: unknown[]) =>
  JSON.stringify(left) !== JSON.stringify(right);

const hasElectionVotes = async (
  transaction: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
) => {
  const snapshot = await transaction.get(ref.collection("voterRegistry").limit(1));
  return !snapshot.empty;
};

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

export const createPoll = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const title = stringField(request.data, "title", { maxLength: 120 });
  const question = stringField(request.data, "question", { maxLength: 500 });
  const status = pollStatusField(request.data);
  const expiresAt = expiresAtField(request.data);
  if (status === "open") {
    assertFutureExpiry(expiresAt, "Poll");
  }
  if (status === "closed") {
    throw new HttpsError(
      "failed-precondition",
      "Create the poll as draft or open, then close it from the voting hub.",
    );
  }
  const options = stringArrayField(request.data, "options", {
    itemMaxLength: 120,
    maxLength: 12,
    minLength: 2,
  });
  const ref = db.collection("polls").doc();
  await ref.set({
    pollId: ref.id,
    orgId: user.profile.orgId,
    title,
    question,
    status,
    resultVisibility: "after_vote",
    expiresAt,
    totalVotes: 0,
    options: buildPollOptions(options),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: user.uid,
    ...(status === "open"
      ? { openedAt: FieldValue.serverTimestamp(), openedBy: user.uid }
      : {}),
  });
  await db.collection("audit_logs").doc().set({
    action: "poll.created",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: ref.path,
    details: { pollId: ref.id, status },
    createdAt: FieldValue.serverTimestamp(),
  });
  await publishOrgAnnouncement({
    audit: {
      action: "poll.notification_created",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { pollId: ref.id, status },
    },
    body:
      status === "open"
        ? "A new poll is now open for voting."
        : "A new poll draft was saved and is not open for voting yet.",
    orgId: user.profile.orgId,
    relatedDocId: ref.id,
    sentBy: user.uid,
    target: status === "open" ? { route: "poll_vote", pollId: ref.id } : null,
    title: `Poll created: ${title}`,
    type: "vote",
  });
  return { ok: true, pollId: ref.id };
});

export const updatePoll = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const pollId = stringField(request.data, "pollId", { maxLength: 160 });
  const title = stringField(request.data, "title", { maxLength: 120 });
  const question = stringField(request.data, "question", { maxLength: 500 });
  const status = pollStatusField(request.data);
  const expiresAt = expiresAtField(request.data);
  if (status === "open") {
    assertFutureExpiry(expiresAt, "Poll");
  }
  const labels = stringArrayField(request.data, "options", {
    itemMaxLength: 120,
    maxLength: 12,
    minLength: 2,
  });
  const ref = pollRef(pollId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const poll = assertVotingRecord(user, snapshot, "Poll not found.");
    if (poll.status === "closed") {
      throw new HttpsError("failed-precondition", "Closed polls cannot be edited.");
    }
    const currentOptions = Array.isArray(poll.options) ? poll.options : [];
    const optionLabelsChanged = labelsChanged(
      pollOptionLabels(currentOptions),
      labels,
    );
    if (
      poll.status === "open" &&
      optionLabelsChanged &&
      typeof poll.totalVotes === "number" &&
      poll.totalVotes > 0
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Poll options cannot be changed after voting has started.",
      );
    }
    if (status === "closed" && poll.status !== "open") {
      throw new HttpsError("failed-precondition", "Open this poll before closing it.");
    }
    transaction.update(ref, {
      title,
      question,
      expiresAt,
      options: buildPollOptions(labels, currentOptions),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
      ...(status === "open" && poll.status === "draft"
        ? {
            status: "open",
            openedAt: FieldValue.serverTimestamp(),
            openedBy: user.uid,
          }
        : {}),
      ...(status === "closed" && poll.status === "open"
        ? {
            status: "closed",
            closedAt: FieldValue.serverTimestamp(),
            closedBy: user.uid,
          }
        : {}),
      ...(status === "draft" && poll.status === "draft" ? { status: "draft" } : {}),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "poll.updated",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { pollId, status },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await publishOrgAnnouncement({
    audit: {
      action: "poll.notification_updated",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { pollId, status },
    },
    body:
      status === "closed"
        ? "A poll was updated and is now closed."
        : status === "open"
          ? "A poll was updated and is open for voting."
          : "A poll draft was updated.",
    orgId: user.profile.orgId,
    relatedDocId: pollId,
    sentBy: user.uid,
    target: status === "draft" ? null : { route: "poll_vote", pollId },
    title: `Poll updated: ${title}`,
    type: "vote",
  });

  return { ok: true, pollId };
});

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
    if (isExpired(poll)) {
      throw new HttpsError(
        "failed-precondition",
        "Update the poll expiry date before opening it.",
      );
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

  const pollSnapshot = await ref.get();
  const poll = pollSnapshot.data() ?? {};
  const title =
    typeof poll.title === "string" && poll.title.trim() ? poll.title.trim() : "Poll";
  await publishOrgAnnouncement({
    audit: {
      action: "poll.notification_opened",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { pollId },
    },
    body: "Voting is now open.",
    orgId: user.profile.orgId,
    relatedDocId: pollId,
    sentBy: user.uid,
    target: { route: "poll_vote", pollId },
    title: `Poll opened: ${title}`,
    type: "vote",
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

  const pollSnapshot = await ref.get();
  const poll = pollSnapshot.data() ?? {};
  const title =
    typeof poll.title === "string" && poll.title.trim() ? poll.title.trim() : "Poll";
  await publishOrgAnnouncement({
    audit: {
      action: "poll.notification_closed",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { pollId },
    },
    body: "Voting has closed. Check the app for the latest result view.",
    orgId: user.profile.orgId,
    relatedDocId: pollId,
    sentBy: user.uid,
    target: { route: "poll_vote", pollId },
    title: `Poll closed: ${title}`,
    type: "vote",
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
    if (isExpired(poll)) {
      throw new HttpsError("failed-precondition", "This poll has expired.");
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
    if (isExpired(election)) {
      throw new HttpsError(
        "failed-precondition",
        "Update the election expiry date before opening it.",
      );
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

  const electionSnapshot = await ref.get();
  const election = electionSnapshot.data() ?? {};
  const title =
    typeof election.title === "string" && election.title.trim()
      ? election.title.trim()
      : "Election";
  await publishOrgAnnouncement({
    audit: {
      action: "election.notification_opened",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { electionId },
    },
    body: "Voting is now open.",
    orgId: user.profile.orgId,
    relatedDocId: electionId,
    sentBy: user.uid,
    target: { route: "election_ballot", electionId },
    title: `Election opened: ${title}`,
    type: "vote",
  });

  return { electionId, ok: true };
});

export const createElection = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const title = stringField(request.data, "title", { maxLength: 120 });
  const ballotType = ballotTypeField(request.data);
  const status = electionStatusField(request.data);
  const expiresAt = expiresAtField(request.data);
  if (status === "open") {
    assertFutureExpiry(expiresAt, "Election");
  }
  if (status === "closed") {
    throw new HttpsError(
      "failed-precondition",
      "Create the election as draft or open, then close it from the voting hub.",
    );
  }
  const races = raceInputsField(request.data);
  const ref = db.collection("elections").doc();
  await ref.set({
    electionId: ref.id,
    orgId: user.profile.orgId,
    title,
    ballotType,
    status,
    resultVisibility: "after_close",
    expiresAt,
    races,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: user.uid,
    ...(status === "open"
      ? { openedAt: FieldValue.serverTimestamp(), openedBy: user.uid }
      : {}),
  });
  await db.collection("audit_logs").doc().set({
    action: "election.created",
    actorUid: user.uid,
    actorRole: user.profile.role,
    orgId: user.profile.orgId,
    targetPath: ref.path,
    details: { electionId: ref.id, status },
    createdAt: FieldValue.serverTimestamp(),
  });
  await publishOrgAnnouncement({
    audit: {
      action: "election.notification_created",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { electionId: ref.id, status },
    },
    body:
      status === "open"
        ? "A new election is now open for voting."
        : "A new election draft was saved and is not open for voting yet.",
    orgId: user.profile.orgId,
    relatedDocId: ref.id,
    sentBy: user.uid,
    target:
      status === "open"
        ? { route: "election_ballot", electionId: ref.id }
        : null,
    title: `Election created: ${title}`,
    type: "vote",
  });
  return { electionId: ref.id, ok: true };
});

export const updateElection = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const title = stringField(request.data, "title", { maxLength: 120 });
  const ballotType = ballotTypeField(request.data);
  const status = electionStatusField(request.data);
  const expiresAt = expiresAtField(request.data);
  if (status === "open") {
    assertFutureExpiry(expiresAt, "Election");
  }
  const races = raceInputsField(request.data);
  const ref = electionRef(electionId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const election = assertVotingRecord(user, snapshot, "Election not found.");
    if (election.status === "closed") {
      throw new HttpsError("failed-precondition", "Closed elections cannot be edited.");
    }
    const currentRaces = Array.isArray(election.races) ? election.races : [];
    if (election.status === "open" && racesChanged(currentRaces, races)) {
      if (await hasElectionVotes(transaction, ref)) {
        throw new HttpsError(
          "failed-precondition",
          "Election races cannot be changed after voting has started.",
        );
      }
    }
    if (status === "closed" && election.status !== "open") {
      throw new HttpsError("failed-precondition", "Open this election before closing it.");
    }
    transaction.update(ref, {
      title,
      ballotType,
      expiresAt,
      races,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
      ...(status === "open" && election.status === "draft"
        ? {
            status: "open",
            openedAt: FieldValue.serverTimestamp(),
            openedBy: user.uid,
          }
        : {}),
      ...(status === "closed" && election.status === "open"
        ? {
            status: "closed",
            closedAt: FieldValue.serverTimestamp(),
            closedBy: user.uid,
          }
        : {}),
      ...(status === "draft" && election.status === "draft"
        ? { status: "draft" }
        : {}),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "election.updated",
      actorUid: user.uid,
      actorRole: user.profile.role,
      orgId: user.profile.orgId,
      targetPath: ref.path,
      details: { electionId, status },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await publishOrgAnnouncement({
    audit: {
      action: "election.notification_updated",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { electionId, status },
    },
    body:
      status === "closed"
        ? "An election was updated and is now closed."
        : status === "open"
          ? "An election was updated and is open for voting."
          : "An election draft was updated.",
    orgId: user.profile.orgId,
    relatedDocId: electionId,
    sentBy: user.uid,
    target:
      status === "draft"
        ? null
        : { route: "election_ballot", electionId },
    title: `Election updated: ${title}`,
    type: "vote",
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

  const electionSnapshot = await ref.get();
  const election = electionSnapshot.data() ?? {};
  const title =
    typeof election.title === "string" && election.title.trim()
      ? election.title.trim()
      : "Election";
  await publishOrgAnnouncement({
    audit: {
      action: "election.notification_closed",
      actorRole: user.profile.role,
      actorUid: user.uid,
      details: { electionId },
    },
    body: "Voting has closed. Check the app for the latest result view.",
    orgId: user.profile.orgId,
    relatedDocId: electionId,
    sentBy: user.uid,
    target: { route: "election_ballot", electionId },
    title: `Election closed: ${title}`,
    type: "vote",
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
    if (isExpired(election)) {
      throw new HttpsError("failed-precondition", "This election has expired.");
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

export const listElectionVoterReceipts = onCall(async (request) => {
  const user = await requireVotingAdmin(request);
  const electionId = stringField(request.data, "electionId", { maxLength: 160 });
  const ref = electionRef(electionId);
  const electionSnapshot = await ref.get();
  assertVotingRecord(user, electionSnapshot, "Election not found.");
  const registrySnapshot = await ref.collection("voterRegistry").get();
  const receipts = await Promise.all(
    registrySnapshot.docs.map(async (document): Promise<VoterReceipt> => {
      const record = document.data();
      const uid =
        typeof record.uid === "string" && record.uid.trim()
          ? record.uid.trim()
          : document.id;
      const memberSnapshot = await db.collection("users").doc(uid).get();
      const member = memberSnapshot.data() ?? {};
      return {
        ballotReceipt:
          typeof record.ballotReceipt === "string"
            ? record.ballotReceipt
            : "",
        email: typeof member.email === "string" ? member.email : "",
        fullName:
          typeof member.fullName === "string" && member.fullName.trim()
            ? member.fullName
            : uid,
        uid,
        votedAt:
          record.votedAt &&
          typeof record.votedAt === "object" &&
          "toDate" in record.votedAt &&
          typeof record.votedAt.toDate === "function"
            ? record.votedAt.toDate().toISOString()
            : null,
      };
    }),
  );
  receipts.sort((left, right) => left.fullName.localeCompare(right.fullName));
  return { electionId, ok: true, receipts };
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
