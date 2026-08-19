import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {applyPalette} from './colors';
import {
  DEFAULT_THEME_ID,
  THEME_BY_ID,
  THEME_DEFINITIONS,
  isThemeId,
} from './palettes';
import {ThemeId} from './types';

const STORAGE_KEY = '@tiwani/appearance-theme';

type ThemeState = {
  themeId: ThemeId;
  hydrated: boolean;
  setThemeId: (themeId: ThemeId) => Promise<void>;
  hydrate: () => Promise<void>;
};

const applyThemeId = (themeId: ThemeId) => {
  applyPalette(THEME_BY_ID[themeId].colors);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: DEFAULT_THEME_ID,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const themeId = isThemeId(stored) ? stored : DEFAULT_THEME_ID;
      applyThemeId(themeId);
      set({themeId, hydrated: true});
    } catch {
      applyThemeId(DEFAULT_THEME_ID);
      set({themeId: DEFAULT_THEME_ID, hydrated: true});
    }
  },
  setThemeId: async themeId => {
    if (!THEME_BY_ID[themeId]) {
      return;
    }
    applyThemeId(themeId);
    set({themeId});
    try {
      await AsyncStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // Preference is still applied in-session if persistence fails.
    }
  },
}));

export const getThemeOptions = () =>
  THEME_DEFINITIONS.map(theme => ({
    id: theme.id,
    label: theme.label,
  }));
