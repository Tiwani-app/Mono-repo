import {
  Candidate,
  Election,
  Poll,
  PollOption,
  Race,
} from '../../types/voting';
import {
  DocumentSnapshotLike,
  RawRecord,
  asNullableString,
  asNumber,
  asString,
  enumValue,
  snapshotToRecord,
} from './shared';

const pollStatuses: Poll['status'][] = ['draft', 'open', 'closed'];
const pollResultVisibility: Poll['resultVisibility'][] = ['after_vote', 'after_close'];
const ballotTypes: Election['ballotType'][] = ['open', 'secret'];
const electionStatuses: Election['status'][] = ['draft', 'open', 'closed'];
const electionResultVisibility: Election['resultVisibility'][] = ['after_close', 'admin_only'];

const optionFromRecord = (record: RawRecord, index: number): PollOption => ({
  id: asString(record.id, `option-${index + 1}`),
  label: asString(record.label),
  imageURL: asNullableString(record.imageURL),
  voteCount: asNumber(record.voteCount),
});

const candidateFromRecord = (record: RawRecord): Candidate => ({
  uid: asNullableString(record.uid),
  name: asString(record.name),
  manifestoLine: asString(record.manifestoLine),
  photoURL: asNullableString(record.photoURL),
});

const raceFromRecord = (record: RawRecord, index: number): Race => ({
  raceId: asString(record.raceId, `race-${index + 1}`),
  office: asString(record.office),
  candidates: Array.isArray(record.candidates)
    ? record.candidates.map(item =>
        candidateFromRecord(item && typeof item === 'object' ? (item as RawRecord) : {}),
      )
    : [],
});

export const pollFromRecord = (record: RawRecord): Poll => {
  const options = Array.isArray(record.options)
    ? record.options.map((item, index) =>
        optionFromRecord(item && typeof item === 'object' ? (item as RawRecord) : {}, index),
      )
    : [];
  return {
    id: asString(record.id),
    title: asString(record.title),
    question: asString(record.question),
    options,
    status: enumValue(record.status, pollStatuses, 'draft'),
    totalVotes: asNumber(
      record.totalVotes,
      options.reduce((sum, option) => sum + option.voteCount, 0),
    ),
    resultVisibility: enumValue(record.resultVisibility, pollResultVisibility, 'after_vote'),
  };
};

export const pollFromSnapshot = (snapshot: DocumentSnapshotLike): Poll =>
  pollFromRecord(snapshotToRecord(snapshot));

export const electionFromRecord = (record: RawRecord): Election => ({
  id: asString(record.id),
  title: asString(record.title),
  ballotType: enumValue(record.ballotType, ballotTypes, 'secret'),
  races: Array.isArray(record.races)
    ? record.races.map((item, index) =>
        raceFromRecord(item && typeof item === 'object' ? (item as RawRecord) : {}, index),
      )
    : [],
  status: enumValue(record.status, electionStatuses, 'draft'),
  resultVisibility: enumValue(record.resultVisibility, electionResultVisibility, 'after_close'),
});

export const electionFromSnapshot = (snapshot: DocumentSnapshotLike): Election =>
  electionFromRecord(snapshotToRecord(snapshot));

