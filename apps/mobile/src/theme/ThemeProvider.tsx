import React, {useEffect, useMemo} from 'react';
import {StyleSheet, TextStyle, ViewStyle, ImageStyle} from 'react-native';
import {colors} from './colors';
import {AppColors} from './types';
import {useThemeStore} from './themeStore';

type NamedStyles<T> = {[P in keyof T]: ViewStyle | TextStyle | ImageStyle};

export const useThemeColors = (): AppColors => {
  const themeId = useThemeStore(state => state.themeId);
  // Clone so dependents (useMemo / useThemedStyles) see a new reference per theme.
  return useMemo(
    () => ({
      bg: {...colors.bg},
      gold: {...colors.gold},
      text: {...colors.text},
      status: {...colors.status},
      border: {...colors.border},
    }),
    [themeId],
  );
};

export const useThemeId = () => useThemeStore(state => state.themeId);

export const useSetThemeId = () => useThemeStore(state => state.setThemeId);

export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (themeColors: AppColors) => T,
): T {
  const themeColors = useThemeColors();
  return useMemo(
    () => StyleSheet.create(factory(themeColors)) as T,
    // factory is expected to be stable (module-level createStyles).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeColors],
  );
}

type ThemeBootstrapProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export const ThemeBootstrap = ({children, fallback = null}: ThemeBootstrapProps) => {
  const hydrated = useThemeStore(state => state.hydrated);
  const hydrate = useThemeStore(state => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export type {AppColors};
