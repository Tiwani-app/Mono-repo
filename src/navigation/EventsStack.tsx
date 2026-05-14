import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import EventsScreen from '../screens/events/EventsScreen';
import {EventsStackParamList} from './types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

const EventsStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="EventsList" component={EventsScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
  </Stack.Navigator>
);

export default EventsStack;
