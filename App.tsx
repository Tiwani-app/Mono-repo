import React, {useEffect, useState} from 'react';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import {
  initializeFirebaseRuntimeServices,
  recordCrashlyticsError,
} from './src/config/firebase';
import RootNavigator from './src/navigation/RootNavigator';

const App = () => {
  const [runtimeReady, setRuntimeReady] = useState(false);

  useEffect(() => {
    let active = true;

    initializeFirebaseRuntimeServices()
      .catch(error => {
        console.warn('Firebase runtime services could not be initialized.', error);
        recordCrashlyticsError(
          error,
          'Firebase runtime services initialization failed.',
        );
      })
      .finally(() => {
        if (active) {
          setRuntimeReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!runtimeReady) {
    return <LoadingSpinner />;
  }

  return <RootNavigator />;
};

export default App;
