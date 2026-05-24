import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ElectionBallotScreen from '../screens/voting/ElectionBallotScreen';
import ElectionFormScreen from '../screens/voting/ElectionFormScreen';
import ElectionResultsScreen from '../screens/voting/ElectionResultsScreen';
import PollFormScreen from '../screens/voting/PollFormScreen';
import PollVoteScreen from '../screens/voting/PollVoteScreen';
import VotingHubScreen from '../screens/voting/VotingHubScreen';
import {VotingStackParamList} from './types';

const Stack = createNativeStackNavigator<VotingStackParamList>();

const VotingStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="VotingHub" component={VotingHubScreen} />
    <Stack.Screen name="PollVote" component={PollVoteScreen} />
    <Stack.Screen name="ElectionBallot" component={ElectionBallotScreen} />
    <Stack.Screen name="PollForm" component={PollFormScreen} />
    <Stack.Screen name="ElectionForm" component={ElectionFormScreen} />
    <Stack.Screen name="ElectionResults" component={ElectionResultsScreen} />
  </Stack.Navigator>
);

export default VotingStack;
