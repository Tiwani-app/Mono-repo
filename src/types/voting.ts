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
  status: 'open' | 'closed';
}
