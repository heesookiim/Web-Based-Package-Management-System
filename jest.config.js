module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ["json", "text", "lcov", "clover"],
  coverageDirectory: "coverage",
  //collectCoverageFrom: ["rest_api/routes/post_packages.ts", "rate/analyze.ts", "rate/new-metrics.ts", "rate/metric.ts", ""],
  testTimeout: 20000
};
