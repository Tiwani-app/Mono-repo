import {create} from 'zustand';
import {User} from '../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (value: boolean) => void;
  updateCurrentUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  loading: true,
  setUser: user => set({user}),
  setLoading: loading => set({loading}),
  updateCurrentUser: data =>
    set(state => ({user: state.user ? {...state.user, ...data} : state.user})),
}));
