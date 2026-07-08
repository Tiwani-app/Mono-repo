module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx|js)$": "babel-jest",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
};
