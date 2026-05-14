import {create} from 'zustand';
import {User} from '../types/user';

interface MembersState {
  members: User[];
  selectedMember: User | null;
  filter: 'all' | 'active' | 'overdue';
  searchQuery: string;
  loading: boolean;
  error: string | null;
  setMembers: (members: User[]) => void;
  setSelectedMember: (member: User | null) => void;
  setFilter: (filter: 'all' | 'active' | 'overdue') => void;
  setSearchQuery: (query: string) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMembersStore = create<MembersState>(set => ({
  members: [],
  selectedMember: null,
  filter: 'all',
  searchQuery: '',
  loading: false,
  error: null,
  setMembers: members => set({members}),
  setSelectedMember: selectedMember => set({selectedMember}),
  setFilter: filter => set({filter}),
  setSearchQuery: searchQuery => set({searchQuery}),
  setLoading: loading => set({loading}),
  setError: error => set({error}),
}));
