export type AppColors = {
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    elevated: string;
  };
  gold: {
    default: string;
    light: string;
    dark: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    onGold: string;
  };
  status: {
    success: string;
    error: string;
    info: string;
    purple: string;
  };
  border: {
    default: string;
    subtle: string;
  };
};

export type ThemeId =
  | 'original'
  | 'theme-02'
  | 'theme-05'
  | 'theme-07'
  | 'theme-09'
  | 'theme-10'
  | 'theme-20'
  | 'theme-24'
  | 'theme-25'
  | 'theme-26'
  | 'theme-27'
  | 'theme-30'
  | 'theme-33'
  | 'theme-38'
  | 'theme-40'
  | 'theme-42';

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  colors: AppColors;
};
