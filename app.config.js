const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV || "development";
const isProduction = appEnvironment === "production";

const appName = process.env.TIWANI_APP_NAME || (isProduction ? "Tiwani" : "Tiwani Dev");
const appVersion =
  process.env.TIWANI_APP_VERSION ||
  process.env.EXPO_PUBLIC_APP_VERSION ||
  "2.1.0";
const iosBundleIdentifier =
  process.env.TIWANI_IOS_BUNDLE_IDENTIFIER || "com.tiwani.app";
const androidPackage =
  process.env.TIWANI_ANDROID_PACKAGE || "com.tiwani.app";
const iosGoogleServicesFile =
  process.env.TIWANI_IOS_GOOGLE_SERVICES_FILE || "./GoogleService-Info.plist";
const androidGoogleServicesFile =
  process.env.TIWANI_ANDROID_GOOGLE_SERVICES_FILE || "./google-services.json";
const iosApsEnvironment =
  process.env.TIWANI_IOS_APS_ENVIRONMENT ||
  (isProduction ? "production" : "development");

module.exports = {
  expo: {
    name: appName,
    slug: "tiwani",
    version: appVersion,
    orientation: "portrait",
    scheme: "tiwani",
    userInterfaceStyle: "dark",
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/messaging",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            forceStaticLinking: [
              "RNFBApp",
              "RNFBAuth",
              "RNFBFirestore",
              "RNFBFunctions",
              "RNFBMessaging",
              "RNFBStorage",
            ],
          },
        },
      ],
    ],
    ios: {
      bundleIdentifier: iosBundleIdentifier,
      googleServicesFile: iosGoogleServicesFile,
      entitlements: {
        "aps-environment": iosApsEnvironment,
      },
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
      },
    },
    android: {
      package: androidPackage,
      googleServicesFile: androidGoogleServicesFile,
    },
    extra: {
      appEnvironment,
    },
  },
};
