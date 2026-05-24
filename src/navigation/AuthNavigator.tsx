import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RequestJoinScreen from '../screens/auth/RequestJoinScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import {AuthStackParamList} from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="RequestJoin" component={RequestJoinScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
