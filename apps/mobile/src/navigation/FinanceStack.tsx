import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdHocChargeScreen from '../screens/finance/AdHocChargeScreen';
import ChargeLedgerScreen from '../screens/finance/ChargeLedgerScreen';
import ContributionPoolFormScreen from '../screens/finance/ContributionPoolFormScreen';
import ContributionPoolMembersScreen from '../screens/finance/ContributionPoolMembersScreen';
import DuesPeriodFormScreen from '../screens/finance/DuesPeriodFormScreen';
import DuesPeriodMembersScreen from '../screens/finance/DuesPeriodMembersScreen';
import FinanceAdminScreen from '../screens/finance/FinanceAdminScreen';
import MyContributionsScreen from '../screens/finance/MyContributionsScreen';
import MyLedgerScreen from '../screens/finance/MyLedgerScreen';
import RecordContributionScreen from '../screens/finance/RecordContributionScreen';
import RecordPaymentScreen from '../screens/finance/RecordPaymentScreen';
import RequestWithdrawalScreen from '../screens/finance/RequestWithdrawalScreen';
import WithdrawRequestsScreen from '../screens/finance/WithdrawRequestsScreen';
import {colors} from '../theme';
import {FinanceStackParamList} from './types';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

const FinanceStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: {backgroundColor: colors.bg.secondary},
    }}>
    <Stack.Screen name="FinanceAdmin" component={FinanceAdminScreen} />
    <Stack.Screen name="MyLedger" component={MyLedgerScreen} />
    <Stack.Screen name="MyContributions" component={MyContributionsScreen} />
    <Stack.Screen name="ChargeLedger" component={ChargeLedgerScreen} />
    <Stack.Screen name="DuesPeriodForm" component={DuesPeriodFormScreen} />
    <Stack.Screen name="DuesPeriodMembers" component={DuesPeriodMembersScreen} />
    <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} />
    <Stack.Screen name="AdHocCharge" component={AdHocChargeScreen} />
    <Stack.Screen
      name="ContributionPoolForm"
      component={ContributionPoolFormScreen}
    />
    <Stack.Screen
      name="RecordContribution"
      component={RecordContributionScreen}
    />
    <Stack.Screen name="WithdrawRequests" component={WithdrawRequestsScreen} />
    <Stack.Screen
      name="RequestWithdrawal"
      component={RequestWithdrawalScreen}
    />
    <Stack.Screen
      name="ContributionPoolMembers"
      component={ContributionPoolMembersScreen}
    />
  </Stack.Navigator>
);

export default FinanceStack;
