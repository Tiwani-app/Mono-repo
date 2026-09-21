import React, {useEffect, useState} from 'react';
import {StripeProvider} from '@stripe/stripe-react-native';
import './src/config/scrollIndicators';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import {env} from './src/config/env';
import {
  initializeFirebaseRuntimeServices,
  recordCrashlyticsError,
} from './src/config/firebase';
import RootNavigator from './src/navigation/RootNavigator';
import {ThemeBootstrap} from './src/theme';

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

  return (
    <StripeProvider
      publishableKey={env.stripePublishableKey}
      merchantIdentifier={env.stripeMerchantIdentifier}
    >
      <ThemeBootstrap fallback={<LoadingSpinner />}>
        <RootNavigator />
      </ThemeBootstrap>
    </StripeProvider>
  );
};

export default App;
