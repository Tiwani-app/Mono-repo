import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import FinanceAdminScreen from '../screens/finance/FinanceAdminScreen';
import MyLedgerScreen from '../screens/finance/MyLedgerScreen';
import {FinanceStackParamList} from './types';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="FinanceAdmin" component={FinanceAdminScreen} />
    <Stack.Screen name="MyLedger" component={MyLedgerScreen} />
  </Stack.Navigator>
);

export default FinanceStack;
