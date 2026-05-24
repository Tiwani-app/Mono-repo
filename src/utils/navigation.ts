export const safeGoBack = (
  navigation: {canGoBack?: () => boolean; goBack: () => void; navigate: (...args: any[]) => void},
  fallbackRoute: string,
  fallbackParams?: object,
) => {
  if (navigation.canGoBack?.()) {
    navigation.goBack();
    return;
  }
  if (fallbackParams) {
    navigation.navigate(fallbackRoute, fallbackParams);
    return;
  }
  navigation.navigate(fallbackRoute);
};
