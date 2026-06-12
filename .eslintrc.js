module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['functions/lib/**', 'functions/node_modules/**'],
  rules: {
    'prettier/prettier': 'off',
    quotes: 'off',
    'react/no-unstable-nested-components': ['warn', {allowAsProps: true}],
  },
};
