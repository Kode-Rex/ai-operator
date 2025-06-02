module.exports = {
  // Set the test environment to JSDOM (browser-like environment)
  testEnvironment: 'jsdom',
  
  // Specify the directories where Jest should look for tests
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
  
  // Set up file transforms (preprocessing)
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // Configure coverage collection
  collectCoverage: true,
  collectCoverageFrom: ['js/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Mock static assets
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.test.js',
    '!js/**/*.spec.js',
    '!**/node_modules/**',
  ],
  
  // The test environment that will be used for testing
  testEnvironment: 'jsdom',
  
  // Global variables to be available in all test environments
  globals: {
    window: {},
  },
};