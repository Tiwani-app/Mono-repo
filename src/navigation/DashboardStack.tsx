import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AccountDeletionRequestScreen from "../screens/account/AccountDeletionRequestScreen";
import AnnouncementFormScreen from "../screens/notifications/AnnouncementFormScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DocumentFormScreen from "../screens/library/DocumentFormScreen";
import DocumentViewerScreen from "../screens/library/DocumentViewerScreen";
import JoinRequestsScreen from "../screens/members/JoinRequestsScreen";
import LibraryCategoryScreen from "../screens/library/LibraryCategoryScreen";
import LibraryManageScreen from "../screens/library/LibraryManageScreen";
import LibraryScreen from "../screens/library/LibraryScreen";
import MemberFormScreen from "../screens/members/MemberFormScreen";
import MemberProfileScreen from "../screens/members/MemberProfileScreen";
import MembersListScreen from "../screens/members/MembersListScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { DashboardStackParamList } from "./types";

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="AnnouncementForm" component={AnnouncementFormScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen
      name="AccountDeletion"
      component={AccountDeletionRequestScreen}
    />
    <Stack.Screen name="MembersList" component={MembersListScreen} />
    <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    <Stack.Screen name="MemberForm" component={MemberFormScreen} />
    <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} />
    <Stack.Screen name="Library" component={LibraryScreen} />
    <Stack.Screen name="LibraryCategory" component={LibraryCategoryScreen} />
    <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    <Stack.Screen name="LibraryManage" component={LibraryManageScreen} />
    <Stack.Screen name="DocumentForm" component={DocumentFormScreen} />
  </Stack.Navigator>
);

export default DashboardStack;
