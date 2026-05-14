# Tiwani Frontend

Tiwani is a mobile membership management app for associations and cooperatives. This repository contains the React Native frontend: screens, navigation, UI components, state stores, hooks, typed models, and service calls used by the app.

## What The App Does

- Authenticates members and routes them into the app.
- Shows a member dashboard with access to core association tools.
- Manages events, calendars, and event details.
- Displays member directories and profiles with role-based access.
- Supports voting through polls and election ballots, with financial-status gating.
- Tracks dues, balances, ledgers, and admin finance views.
- Provides notifications, settings, and a member marketplace.

## Tech Stack

- React Native with Expo
- TypeScript
- React Navigation
- Zustand
- Firebase client SDKs
- React Hook Form
- date-fns

## Project Structure

```text
src/
  components/   Shared and feature-specific UI components
  hooks/        Feature hooks that connect screens to stores/services
  navigation/   Auth, app, tab, and stack navigators
  screens/      App screens grouped by feature
  services/     Firebase and feature service functions
  store/        Zustand stores
  theme/        Colors, spacing, typography
  types/        Shared TypeScript models
  utils/        Formatting, validation, and role helpers
```

## Getting Started

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm start
```

Platform shortcuts:

```bash
npm run ios
npm run android
```

## Developer Commands

```bash
npm run typecheck
npm run lint
npm test
```

## Notes For Contributors

- Keep screens thin: use hooks, stores, and services for data flow.
- Keep shared visual decisions in `src/theme`.
- Use the existing navigation and component patterns before adding new abstractions.
- Backend, Firebase configuration, Cloud Functions, and Firestore rules are outside this frontend project.
