const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  coverageReporters: ['text', 'html'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  collectCoverage: true,
  // `placeResolution` is pure logic covered by the unit suite, for the same reason `models` is
  // excluded here - the two configs are complementary, not overlapping.
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!*/node_modules/',
    '!/vendor/**',
    '!*/common/**',
    '!**/models/**',
    '!**/placeResolution/**',
    '!**/constants.ts',
    '!<rootDir>/src/*',
  ],
  coverageDirectory: '<rootDir>/coverage',
  rootDir: '../../../.',
  testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.ts'],
  setupFilesAfterEnv: [
    'jest-openapi',
    '<rootDir>/tests/configurations/initJestOpenapi.setup.ts',
    '<rootDir>/tests/configurations/jest.setupAfterEnv.js',
  ],
  globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.ts',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      { multipleReportsUnitePath: './reports', pageTitle: 'integration', publicPath: './reports', filename: 'integration.html' },
    ],
  ],
  moduleDirectories: ['node_modules', 'src'],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      // A percentage rather than an absolute count of uncovered statements. The absolute budget
      // could not survive a new module being added: every service has a handful of statements
      // that cannot be reached over HTTP - error handlers in the lat/lon loader, defensive
      // guards - and the count grows with the codebase while the budget does not. Statement
      // coverage here is currently 98.3%.
      statements: 95,
    },
  },
  testTimeout: 50000,
};
