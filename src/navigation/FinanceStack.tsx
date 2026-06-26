import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdHocChargeScreen from '../screens/finance/AdHocChargeScreen';
import DuesPeriodFormScreen from '../screens/finance/DuesPeriodFormScreen';
import DuesPeriodMembersScreen from '../screens/finance/DuesPeriodMembersScreen';
import FinanceAdminScreen from '../screens/finance/FinanceAdminScreen';
import MyLedgerScreen from '../screens/finance/MyLedgerScreen';
import RecordPaymentScreen from '../screens/finance/RecordPaymentScreen';
import {FinanceStackParamList} from './types';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="FinanceAdmin" component={FinanceAdminScreen} />
    <Stack.Screen name="MyLedger" component={MyLedgerScreen} />
    <Stack.Screen name="DuesPeriodForm" component={DuesPeriodFormScreen} />
    <Stack.Screen name="DuesPeriodMembers" component={DuesPeriodMembersScreen} />
    <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} />
    <Stack.Screen name="AdHocCharge" component={AdHocChargeScreen} />
  </Stack.Navigator>
);

export default FinanceStack;
