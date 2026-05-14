import {useEffect} from 'react';
import {onAuthStateChange} from '../services/authService';
import {useAuthStore} from '../store/authStore';

export const useAuth = () => {
  const {setUser, setLoading} = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(user => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setLoading, setUser]);

  return useAuthStore();
};
