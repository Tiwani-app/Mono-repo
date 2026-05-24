import { Election, Poll } from '../types/voting';
import { delay, mockElections, mockPolls } from './mockData';

export interface PollInput {
  title: string;
  question: string;
  status: Poll['status'];
  options: string[];
}

let polls = mockPolls.slice();
let elections = mockElections.slice();
const pollSubscribers = new Set<(polls: Poll[]) => void>();
const electionSubscribers = new Set<(elections: Election[]) => void>();
const pollVotes = new Set<string>();
const electionVotes = new Set<string>();

const visiblePolls = () => polls.filter(poll => poll.status === 'open');
const visibleElections = () => elections.filter(election => election.status === 'open');

const emitPolls = () => {
  const snapshot = visiblePolls();
  pollSubscribers.forEach(callback => callback(snapshot));
};

const emitElections = () => {
  const snapshot = visibleElections();
  electionSubscribers.forEach(callback => callback(snapshot));
};

const optionIdFromLabel = (label: string, index: number) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `option-${index + 1}`;
};

export const subscribeToPolls = (callback: (polls: Poll[]) => void) => {
  pollSubscribers.add(callback);
  callback(visiblePolls());
  return () => {
    pollSubscribers.delete(callback);
  };
};

export const subscribeToElections = (callback: (elections: Election[]) => void) => {
  electionSubscribers.add(callback);
  callback(visibleElections());
  return () => {
    electionSubscribers.delete(callback);
  };
};

export const getPoll = async (pollId: string): Promise<Poll> => {
  await delay();
  const poll = polls.find(item => item.id === pollId);
  if (!poll) {
    throw new Error('Poll not found.');
  }
  return poll;
};

export const createPoll = async (data: PollInput): Promise<Poll> => {
  await delay();
  const poll: Poll = {
    id: `poll-${Date.now()}`,
    title: data.title,
    question: data.question,
    status: data.status,
    totalVotes: 0,
    options: data.options.map((label, index) => ({
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
  polls = polls.map(poll => {
    if (poll.id !== pollId) {
      return poll;
    }
    const nextOptions = data.options
      ? data.options.map((label, index) => {
          const existing = poll.options.find(option => option.label === label);
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
      ...data,
      options: nextOptions,
      totalVotes: nextOptions.reduce((sum, option) => sum + option.voteCount, 0),
    };
  });
  emitPolls();
};

export const closePoll = async (pollId: string): Promise<void> => {
  await updatePoll(pollId, { status: 'closed' });
};

export const hasCastPollVote = async (pollId: string, userId: string): Promise<boolean> => {
  await delay();
  return pollVotes.has(`${pollId}:${userId}`);
};

export const hasCastElectionVote = async (electionId: string, userId: string): Promise<boolean> => {
  await delay();
  return electionVotes.has(`${electionId}:${userId}`);
};

export const castPollVote = async (pollId: string, optionId: string, userId: string): Promise<void> => {
  await delay();
  const voteKey = `${pollId}:${userId}`;
  if (pollVotes.has(voteKey)) {
    return;
  }
  const poll = polls.find(item => item.id === pollId);
  const option = poll?.options.find(item => item.id === optionId);
  if (!poll || !option) {
    throw new Error('Vote option not found.');
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
  const election = elections.find(item => item.id === electionId);
  const completeBallot = election?.races.every(race => choices[race.raceId]);
  if (!election || !completeBallot) {
    throw new Error('Ballot is incomplete.');
  }
  electionVotes.add(voteKey);
  emitElections();
};
