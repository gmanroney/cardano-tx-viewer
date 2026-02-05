module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true
};
