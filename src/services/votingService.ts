import {Election, Poll} from '../types/voting';
import {delay, mockElections, mockPolls} from './mockData';

const pollVotes = new Set<string>();
const electionVotes = new Set<string>();

export const subscribeToPolls = (callback: (polls: Poll[]) => void) => {
  callback(mockPolls.filter(poll => poll.status === 'open'));
  return () => {};
};

export const subscribeToElections = (callback: (elections: Election[]) => void) => {
  callback(mockElections.filter(election => election.status === 'open'));
  return () => {};
};

export const hasCastPollVote = async (pollId: string, userId: string): Promise<boolean> => {
  await delay();
  return pollVotes.has(`${pollId}:${userId}`);
};

export const hasCastElectionVote = async (electionId: string, userId: string): Promise<boolean> => {
  await delay();
  return electionVotes.has(`${electionId}:${userId}`);
};

export const castPollVote = async (pollId: string, optionId: string): Promise<void> => {
  await delay();
  const poll = mockPolls.find(item => item.id === pollId);
  const option = poll?.options.find(item => item.id === optionId);
  if (!poll || !option) {
    throw new Error('Vote option not found.');
  }
  option.voteCount += 1;
  poll.totalVotes += 1;
};

export const castElectionBallot = async (
  _electionId: string,
  _choices: Record<string, string>,
): Promise<void> => {
  await delay();
};
