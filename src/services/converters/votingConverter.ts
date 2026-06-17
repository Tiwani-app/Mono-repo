import {
  Candidate,
  Election,
  Poll,
  PollOption,
  Race,
} from "../../types/voting";
import {
  RawRecord,
  asNullableDate,
  asNullableString,
  asNumber,
  requiredEnum,
  requiredRecordArray,
  requiredString,
} from "./shared";

const pollStatuses: Poll["status"][] = ["draft", "open", "closed"];
const pollResultVisibility: Poll["resultVisibility"][] = [
  "after_vote",
  "after_close",
];
const ballotTypes: Election["ballotType"][] = ["open", "secret"];
const electionStatuses: Election["status"][] = ["draft", "open", "closed"];
const electionResultVisibility: Election["resultVisibility"][] = [
  "after_close",
  "admin_only",
];

const optionFromRecord = (record: RawRecord, index: number): PollOption => ({
  id:
    typeof record.optionId === "string" && record.optionId.trim()
      ? record.optionId
      : `option-${index + 1}`,
  label: requiredString(record, "label"),
  imageURL: asNullableString(record.imageURL),
  voteCount: asNumber(record.voteCount),
});

const candidateFromRecord = (record: RawRecord): Candidate => ({
  uid: asNullableString(record.uid),
  name: requiredString(record, "name"),
  manifestoLine:
    typeof record.manifesto === "string"
      ? record.manifesto
      : typeof record.manifestoLine === "string"
        ? record.manifestoLine
        : "",
  photoURL: asNullableString(record.photoURL),
});

const raceFromRecord = (record: RawRecord, index: number): Race => ({
  raceId:
    typeof record.raceId === "string" && record.raceId.trim()
      ? record.raceId
      : `race-${index + 1}`,
  office: requiredString({ office: record.title }, "office"),
  candidates: requiredRecordArray(record, "candidates").map(
    candidateFromRecord,
  ),
});

export const pollFromRecord = (record: RawRecord): Poll => {
  const options = requiredRecordArray(record, "options").map((item, index) =>
    optionFromRecord(item, index),
  );
  return {
    id: requiredString(record, "id"),
    title: requiredString(record, "title"),
    question: requiredString(record, "question"),
    options,
    status: requiredEnum(record.status, pollStatuses, "status"),
    totalVotes: asNumber(record.totalVotes),
    resultVisibility: requiredEnum(
      record.resultVisibility,
      pollResultVisibility,
      "resultVisibility",
    ),
    expiresAt: asNullableDate(record.expiresAt, "expiresAt"),
  };
};

export const electionFromRecord = (record: RawRecord): Election => ({
  id: requiredString(record, "id"),
  title: requiredString(record, "title"),
  ballotType: requiredEnum(record.ballotType, ballotTypes, "ballotType"),
  races: requiredRecordArray(record, "races").map((item, index) =>
    raceFromRecord(item, index),
  ),
  status: requiredEnum(record.status, electionStatuses, "status"),
  resultVisibility: requiredEnum(
    record.resultVisibility,
    electionResultVisibility,
    "resultVisibility",
  ),
  expiresAt: asNullableDate(record.expiresAt, "expiresAt"),
});
