export type AppEnvironment = 'development' | 'staging' | 'production';

export interface ClientEnv {
  appEnvironment: AppEnvironment;
  useMockData: boolean;
}

declare const process: {
  env: Record<string, string | undefined>;
};

const environmentValue = process.env.EXPO_PUBLIC_APP_ENV;
const mockDataValue = process.env.EXPO_PUBLIC_USE_MOCK_DATA;

const parseEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === 'staging' || value === 'production') {
    return value;
  }
  return 'development';
};

export const env: ClientEnv = {
  appEnvironment: parseEnvironment(environmentValue),
  useMockData: mockDataValue !== 'false',
};

export const missingClientConfigMessage =
  'App configuration is incomplete. Please contact support before continuing.';
