export interface PollOption {
  id: string;
  label: string;
  imageURL: string | null;
  voteCount: number;
}

export interface Poll {
  id: string;
  title: string;
  question: string;
  options: PollOption[];
  status: 'draft' | 'open' | 'closed';
  totalVotes: number;
  resultVisibility: 'after_vote' | 'after_close';
}

export interface Candidate {
  uid: string | null;
  name: string;
  manifestoLine: string;
  photoURL: string | null;
}

export interface Race {
  raceId: string;
  office: string;
  candidates: Candidate[];
}

export interface Election {
  id: string;
  title: string;
  ballotType: 'open' | 'secret';
  races: Race[];
  status: 'draft' | 'open' | 'closed';
  resultVisibility: 'after_close' | 'admin_only';
}

export interface PollVoterState {
  hasVoted: boolean;
  resultsVisible: boolean;
}

export interface ElectionVoterState {
  hasVoted: boolean;
  ballotReceipt: string | null;
  resultsVisible: boolean;
}

export interface ElectionVoterReceipt {
  ballotReceipt: string;
  email: string;
  fullName: string;
  uid: string;
  votedAt: Date | null;
}
