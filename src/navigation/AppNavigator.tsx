import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from '../components/common/FeatherIcon';
import DashboardScreen from '../screens/DashboardScreen';
import EventsStack from './EventsStack';
import FinanceStack from './FinanceStack';
import MoreStack from './MoreStack';
import VotingStack from './VotingStack';
import {colors} from '../theme';
import {AppTabParamList} from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bg.secondary,
        borderTopColor: colors.border.subtle,
        paddingBottom: 6,
        height: 60,
      },
      tabBarActiveTintColor: colors.gold.default,
      tabBarInactiveTintColor: colors.text.tertiary,
      tabBarLabelStyle: {fontSize: 10, fontWeight: '500'},
      tabBarIcon: ({color, size}) => {
        const icons: Record<keyof AppTabParamList, string> = {
          Dashboard: 'home',
          Events: 'calendar',
          Voting: 'check-circle',
          Finance: 'credit-card',
          More: 'grid',
        };
        return <Icon name={icons[route.name]} size={size - 2} color={color} />;
      },
    })}>
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Events" component={EventsStack} />
    <Tab.Screen name="Voting" component={VotingStack} />
    <Tab.Screen name="Finance" component={FinanceStack} />
    <Tab.Screen name="More" component={MoreStack} />
  </Tab.Navigator>
);

export default AppNavigator;
