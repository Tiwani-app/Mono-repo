import {create} from 'zustand';
import {Election, Poll} from '../types/voting';

interface VotingState {
  polls: Poll[];
  elections: Election[];
  selectedPollOption: string | null;
  electionChoices: Record<string, string>;
  hasVotedPoll: boolean;
  hasVotedElection: boolean;
  loading: boolean;
  error: string | null;
  setPolls: (polls: Poll[]) => void;
  setElections: (elections: Election[]) => void;
  setSelectedPollOption: (optionId: string | null) => void;
  setElectionChoice: (raceId: string, candidateName: string) => void;
  setHasVotedPoll: (value: boolean) => void;
  setHasVotedElection: (value: boolean) => void;
  resetElectionChoices: () => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVotingStore = create<VotingState>(set => ({
  polls: [],
  elections: [],
  selectedPollOption: null,
  electionChoices: {},
  hasVotedPoll: false,
  hasVotedElection: false,
  loading: false,
  error: null,
  setPolls: polls => set({polls}),
  setElections: elections => set({elections}),
  setSelectedPollOption: selectedPollOption => set({selectedPollOption}),
  setElectionChoice: (raceId, candidateName) =>
    set(state => ({electionChoices: {...state.electionChoices, [raceId]: candidateName}})),
  setHasVotedPoll: hasVotedPoll => set({hasVotedPoll}),
  setHasVotedElection: hasVotedElection => set({hasVotedElection}),
  resetElectionChoices: () => set({electionChoices: {}}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
