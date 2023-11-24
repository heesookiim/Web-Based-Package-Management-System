module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ["json", "text", "lcov", "clover"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["rest_api/db.ts"]
  // collectCoverageFrom: ["rate/metric.ts", "rate/new-metrics.ts", "rate/analyze.ts", "rest_api/db.ts"]
};
