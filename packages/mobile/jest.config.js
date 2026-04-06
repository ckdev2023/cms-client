module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(spec|test).(ts|tsx|js)"],
  moduleNameMapper: {
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@features/(.*)$": "<rootDir>/src/features/$1",
    "^@domain/(.*)$": "<rootDir>/src/domain/$1",
    "^@data/(.*)$": "<rootDir>/src/data/$1",
    "^@infra/(.*)$": "<rootDir>/src/infra/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
  },
};
