import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MemberProfileScreen from '../screens/members/MemberProfileScreen';
import MembersListScreen from '../screens/members/MembersListScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {MoreStackParamList} from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
    <Stack.Screen name="MembersList" component={MembersListScreen} />
    <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default MoreStack;
