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
    id: 'theme-02',
    label: 'Forest on White',
    // White screen chrome with forest surfaces; dark text throughout for readability.
    colors: light(
      {
        primary: '#E8F0EA',
        secondary: '#FFFFFF',
        tertiary: '#F3F7F4',
        card: '#F3F7F4',
        elevated: '#E2EDE6',
      },
      {
        // Accent icons/buttons use deep-forest shades (not gold).
        default: '#1C3323',
        light: '#3D5848',
        dark: '#0D1E14',
      },
      {
        primary: '#0D1E14',
        secondary: '#3D5848',
        tertiary: '#7A9880',
        onGold: '#EDE7D8',
      },
      {
        default: '#D5E0D8',
        subtle: '#C5D4CA',
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
    id: 'theme-07',
    label: 'Ocean Teal',
    colors: light(
      {
        primary: '#D8F5F7',
        secondary: '#F0FAFA',
        tertiary: '#E5F6F7',
        card: '#FFFFFF',
        elevated: '#D8F5F7',
      },
      {
        default: '#0A7E8C',
        light: '#0DBDD0',
        dark: '#073A40',
      },
      {
        primary: '#073A40',
        secondary: '#0A7E8C',
        tertiary: '#5AA8B0',
        onGold: '#FFFFFF',
      },
      {
        default: '#A8E4E8',
        subtle: '#BFEAEC',
      },
    ),
  },
  {
    id: 'theme-09',
    label: 'Soft Lilac',
    colors: light(
      {
        primary: '#EEE8FF',
        secondary: '#FAF8FF',
        tertiary: '#F3EFFF',
        card: '#FFFFFF',
        elevated: '#EEE8FF',
      },
      {
        default: '#7C5CBF',
        light: '#9B7ED4',
        dark: '#6B4EAA',
      },
      {
        primary: '#2A1560',
        secondary: '#6B4EAA',
        tertiary: '#A090C8',
        onGold: '#FFFFFF',
      },
      {
        default: '#C8B4F0',
        subtle: '#D4C4F8',
      },
    ),
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
    id: 'theme-24',
    label: 'Caribbean Blue',
    colors: coloured(
      {
        primary: '#2470AA',
        secondary: '#3A8FD4',
        tertiary: '#4A9CDE',
        card: '#5AA8E4',
        elevated: '#6BB4EA',
      },
      {
        // Accent icons/buttons use dark Caribbean blue (not gold).
        default: '#0A2A50',
        light: '#1A4A7A',
        dark: '#061830',
      },
      {
        primary: '#FFFFFF',
        secondary: '#EAF5FF',
        tertiary: '#B8D8F0',
        onGold: '#FFFFFF',
      },
      {
        default: '#2470AA',
        subtle: '#5AA8E4',
      },
    ),
  },
  {
    id: 'theme-25',
    label: 'Mauve & Cream',
    colors: coloured(
      {
        primary: '#7A5088',
        secondary: '#9B6EA8',
        tertiary: '#A87AB4',
        card: '#B488C0',
        elevated: '#C098CC',
      },
      {
        default: '#FFD580',
        light: '#FFE0A0',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#F8F0FF',
        tertiary: '#D8C0E0',
        onGold: '#3A1860',
      },
      {
        default: '#7A5088',
        subtle: '#B488C0',
      },
    ),
  },
  {
    id: 'theme-26',
    label: 'Dusty Teal',
    colors: coloured(
      {
        primary: '#2A6060',
        secondary: '#3A8080',
        tertiary: '#449090',
        card: '#4E9C9C',
        elevated: '#5AA8A8',
      },
      {
        // Brighter gold so accents pop on muted teal (standard gold washes out).
        default: '#F0C040',
        light: '#FFD580',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#E8F8F5',
        tertiary: '#B0D0D0',
        onGold: '#0A2828',
      },
      {
        default: '#2A6060',
        subtle: '#4E9C9C',
      },
    ),
  },
  {
    id: 'theme-27',
    label: 'Warm Burgundy',
    colors: coloured(
      {
        primary: '#6A1A28',
        secondary: '#8B2A3A',
        tertiary: '#9A3444',
        card: '#A83E50',
        elevated: '#B84A5C',
      },
      {
        // Sharper gold so accents stand out on burgundy.
        default: '#F0C040',
        light: '#FFD580',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#FFF0F0',
        tertiary: '#D8A0A8',
        onGold: '#3A0810',
      },
      {
        default: '#6A1A28',
        subtle: '#A83E50',
      },
    ),
  },
  {
    id: 'theme-30',
    label: 'Warm Charcoal & Gold',
    colors: coloured(
      {
        primary: '#28231E',
        secondary: '#3A3530',
        tertiary: '#45403A',
        card: '#504A44',
        elevated: '#5C564E',
      },
      {
        default: '#C9962A',
        light: '#DDB048',
        dark: '#8B6914',
      },
      {
        primary: '#F5F0E8',
        secondary: '#D4C8B8',
        tertiary: '#6A5A40',
        onGold: '#1A1510',
      },
      {
        default: '#28231E',
        subtle: '#5C564E',
      },
    ),
  },
  {
    id: 'theme-33',
    label: 'Cool Slate Blue',
    colors: light(
      {
        primary: '#E4EBF4',
        secondary: '#F4F7FB',
        tertiary: '#ECF1F7',
        card: '#FFFFFF',
        elevated: '#E4EBF4',
      },
      {
        default: '#3E5C8A',
        light: '#52627A',
        dark: '#1E2A3D',
      },
      {
        primary: '#1E2A3D',
        secondary: '#52627A',
        tertiary: '#8A98A8',
        onGold: '#FFFFFF',
      },
      {
        default: '#C9D8EA',
        subtle: '#D5E0EE',
      },
    ),
  },
  {
    id: 'theme-38',
    label: 'Emerald Noir',
    colors: coloured(
      {
        primary: '#123C2E',
        secondary: '#1F5C46',
        tertiary: '#286B52',
        card: '#2E7D5F',
        elevated: '#388C6C',
      },
      {
        // Sharper, higher-contrast gold against emerald surfaces.
        default: '#F0C040',
        light: '#FFD580',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#EAF7F1',
        tertiary: '#A0C8B8',
        onGold: '#0D2E22',
      },
      {
        default: '#123C2E',
        subtle: '#2E7D5F',
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
    id: 'theme-42',
    label: 'Cobalt Ink',
    colors: coloured(
      {
        primary: '#14265C',
        secondary: '#1E3A8A',
        tertiary: '#2A48A0',
        card: '#3B5BC4',
        elevated: '#4A6AD0',
      },
      {
        // Sharper gold so accents pop on cobalt surfaces.
        default: '#F0C040',
        light: '#FFD580',
        dark: '#C9962A',
      },
      {
        primary: '#FFFFFF',
        secondary: '#EEF2FF',
        tertiary: '#A8B8E0',
        onGold: '#101B3D',
      },
      {
        default: '#14265C',
        subtle: '#3B5BC4',
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
