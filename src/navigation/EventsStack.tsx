import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import EventCheckInScreen from '../screens/events/EventCheckInScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import EventFormScreen from '../screens/events/EventFormScreen';
import EventsScreen from '../screens/events/EventsScreen';
import {EventsStackParamList} from './types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

const EventsStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="EventsList" component={EventsScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    <Stack.Screen name="EventForm" component={EventFormScreen} />
    <Stack.Screen name="EventCheckIn" component={EventCheckInScreen} />
  </Stack.Navigator>
);

export default EventsStack;
