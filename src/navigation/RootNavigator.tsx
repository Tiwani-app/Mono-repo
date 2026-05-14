import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {onAuthStateChange} from '../services/authService';
import {useAuthStore} from '../store/authStore';

const RootNavigator = () => {
  const {loading, setLoading, setUser, user} = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(authUser => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setLoading, setUser]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <NavigationContainer>{user ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
};

export default RootNavigator;
