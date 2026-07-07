import React, {useCallback, useEffect, useRef} from "react";
import {AppState, AppStateStatus} from "react-native";
import {
  CommonActions,
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PushNotificationRegistrar from '../components/notifications/PushNotificationRegistrar';
import {onAuthStateChange, signOut} from "../services/authService";
import {
  isSessionExpired,
  markSessionActive,
  readLastActiveAt,
} from "../services/sessionService";
import {useAuthStore} from "../store/authStore";
import {getTabRootResetState} from "./tabRoutes";
import {AppTabParamList} from "./types";

const navigationRef = createNavigationContainerRef<AppTabParamList>();

const RootNavigator = () => {
  const {loading, setLoading, setUser, user} = useAuthStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(authUser => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setLoading, setUser]);

  const resetToDashboard = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }
    navigationRef.dispatch(
      CommonActions.reset(getTabRootResetState("Dashboard")),
    );
  }, []);

  const restoreOrExpireSession = useCallback(
    async (uid: string, shouldResetToDashboard: boolean) => {
      const lastActiveAt = await readLastActiveAt(uid);
      if (isSessionExpired(lastActiveAt)) {
        await signOut();
        return;
      }
      await markSessionActive(uid);
      if (shouldResetToDashboard) {
        resetToDashboard();
      }
    },
    [resetToDashboard],
  );

  useEffect(() => {
    if (!user) {
      return;
    }
    restoreOrExpireSession(user.uid, false).catch(error => {
      console.warn("Could not restore session activity.", error);
    });
  }, [restoreOrExpireSession, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      const previousAppState = appState.current;
      appState.current = nextAppState;

      const activeUser = userRef.current;
      if (!activeUser) {
        return;
      }

      if (nextAppState === "background" || nextAppState === "inactive") {
        markSessionActive(activeUser.uid).catch(error => {
          console.warn("Could not save session activity.", error);
        });
        return;
      }

      if (
        nextAppState === "active" &&
        (previousAppState === "background" || previousAppState === "inactive")
      ) {
        restoreOrExpireSession(activeUser.uid, true).catch(error => {
          console.warn("Could not resume session.", error);
        });
      }
    });

    return () => subscription.remove();
  }, [restoreOrExpireSession]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        <>
          <PushNotificationRegistrar />
          <AppNavigator />
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
