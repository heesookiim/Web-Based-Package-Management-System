module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest'
  },
  collectCoverage: true,
  coverageReporters: ["json", "text", "lcov", "clover"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["metric.ts", "new-metrics.ts", "analyze.ts"]

};
