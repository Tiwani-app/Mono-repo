import {AppColors, ThemeDefinition, ThemeId} from './types';

const status = {
  success: '#27AE60',
  error: '#E74C3C',
  info: '#3B82F6',
  purple: '#8B5CF6',
} as const;

/** Theme 01 — current production palette (kept exact). */
export const originalColors: AppColors = {
  bg: {
    primary: '#050C07',
    secondary: '#091510',
    tertiary: '#0D1E14',
    card: '#142518',
    elevated: '#1C3323',
  },
  gold: {
    default: '#C9962A',
    light: '#DDB048',
    dark: '#7A5C1A',
  },
  text: {
    primary: '#EDE7D8',
    secondary: '#7A9880',
    tertiary: '#3D5848',
    onGold: '#050C07',
  },
  status: {...status},
  border: {
    default: '#101A12',
    subtle: '#1E3224',
  },
};

const light = (
  bg: AppColors['bg'],
  accent: AppColors['gold'],
  text: AppColors['text'],
  border: AppColors['border'],
): AppColors => ({
  bg,
  gold: accent,
  text,
  status: {...status},
  border,
});

/** Coloured-background themes: tinted surfaces + light text (fits existing tokens). */
const coloured = (
  bg: AppColors['bg'],
  accent: AppColors['gold'],
  text: AppColors['text'],
  border: AppColors['border'],
): AppColors => ({
  bg,
  gold: accent,
  text,
  status: {...status},
  border,
});

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: 'original',
    label: 'Deep Forest Dark',
    colors: originalColors,
  },
  {
    id: 'theme-10',
    label: 'Forest Green Light',
    colors: light(
      {
        primary: '#E2F0E7',
        secondary: '#F3FAF5',
        tertiary: '#EAF5EE',
        card: '#FFFFFF',
        elevated: '#E2F0E7',
      },
      {
        default: '#1D6B3B',
        light: '#27AE60',
        dark: '#0A3320',
      },
      {
        primary: '#0A3320',
        secondary: '#1D6B3B',
        tertiary: '#6A9A78',
        onGold: '#FFFFFF',
      },
      {
        default: '#B8D9C4',
        subtle: '#C8E2D0',
      },
    ),
  },
  {
    id: 'theme-05',
    label: 'Sky Blue',
    colors: light(
      {
        primary: '#DFF0FF',
        secondary: '#F0F7FF',
        tertiary: '#E8F3FF',
        card: '#FFFFFF',
        elevated: '#DFF0FF',
      },
      {
        default: '#3B82F6',
        light: '#60A5FA',
        dark: '#1A5FAA',
      },
      {
        primary: '#0A2A50',
        secondary: '#1A5FAA',
        tertiary: '#6B9BD1',
        onGold: '#FFFFFF',
      },
      {
        default: '#B3D8F5',
        subtle: '#C9E4F8',
      },
    ),
  },
  {
    id: 'theme-40',
    label: 'Royal Sapphire',
    colors: coloured(
      {
        primary: '#1C3560',
        secondary: '#2A4A8A',
        tertiary: '#345698',
        card: '#3E62A8',
        elevated: '#4A70B4',
      },
      {
        // Sharper gold so accents pop on sapphire surfaces.
        default: '#F0C040',
        light: '#FFD580',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#EDF1FA',
        tertiary: '#A8B8D8',
        onGold: '#14203A',
      },
      {
        default: '#1C3560',
        subtle: '#3E62A8',
      },
    ),
  },
  {
    id: 'theme-givry',
    label: 'Givry',
    // Warm cream (#F5E4CF) chrome with dark text and a bronze accent; accent
    // surfaces (hero card, primary buttons) are bronze with white text.
    colors: light(
      {
        primary: '#F5E4CF',
        secondary: '#FBF3E7',
        tertiary: '#F8ECDA',
        card: '#FDF8F0',
        elevated: '#F0DBBF',
      },
      {
        default: '#7A5230',
        light: '#9A7048',
        dark: '#4E3218',
      },
      {
        primary: '#3A2E1E',
        secondary: '#7A6A54',
        tertiary: '#A89A82',
        onGold: '#FFFFFF',
      },
      {
        default: '#E5D2B8',
        subtle: '#EEDFC9',
      },
    ),
  },
  {
    id: 'theme-grey',
    label: 'Graphite Grey',
    // Neutral dark-grey chrome — softer than pure black, no green tint — with
    // the brand gold accent (gold hero card / primary buttons).
    colors: coloured(
      {
        primary: '#141414',
        secondary: '#1D1D20',
        tertiary: '#26262A',
        card: '#2E2E33',
        elevated: '#38383E',
      },
      {
        default: '#C9962A',
        light: '#DDB048',
        dark: '#8B6914',
      },
      {
        primary: '#F2F2F4',
        secondary: '#A8A8B0',
        tertiary: '#6E6E76',
        onGold: '#141416',
      },
      {
        default: '#141416',
        subtle: '#3A3A40',
      },
    ),
  },
  {
    id: 'theme-20',
    label: 'Pure White Minimal',
    colors: light(
      {
        primary: '#F5F5F5',
        secondary: '#FFFFFF',
        tertiary: '#FAFAFA',
        card: '#F5F5F5',
        elevated: '#EEEEEE',
      },
      {
        // Accent icons/buttons use black / grey (not gold).
        default: '#1A1A1A',
        light: '#666666',
        dark: '#000000',
      },
      {
        primary: '#1A1A1A',
        secondary: '#666666',
        tertiary: '#888888',
        onGold: '#FFFFFF',
      },
      {
        default: '#E0E0E0',
        subtle: '#E8E8E8',
      },
    ),
  },
  {
    id: 'theme-black',
    label: 'Pure Black Minimal',
    // True-black OLED chrome with a monochrome white accent — the inverse of
    // Pure White Minimal. Accent surfaces (hero card, primary buttons) are
    // white with black text.
    colors: coloured(
      {
        primary: '#000000',
        secondary: '#0A0A0A',
        tertiary: '#141414',
        card: '#1A1A1A',
        elevated: '#242424',
      },
      {
        default: '#EDEDED',
        light: '#FFFFFF',
        dark: '#B0B0B0',
      },
      {
        primary: '#F5F5F5',
        secondary: '#A0A0A0',
        tertiary: '#6A6A6A',
        onGold: '#000000',
      },
      {
        default: '#000000',
        subtle: '#262626',
      },
    ),
  },
];

export const THEME_BY_ID: Record<ThemeId, ThemeDefinition> = THEME_DEFINITIONS.reduce(
  (acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  },
  {} as Record<ThemeId, ThemeDefinition>,
);

export const DEFAULT_THEME_ID: ThemeId = 'original';

export const isThemeId = (value: string | null | undefined): value is ThemeId =>
  Boolean(value && value in THEME_BY_ID);
