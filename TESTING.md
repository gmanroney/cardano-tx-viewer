# Testing Guide for Cardano Transaction Viewer

This project includes comprehensive test suites for both backend and frontend components.

## Backend Tests

### Running Backend Tests

```bash
cd backend
npm test                 # Run all tests with coverage
npm run test:watch       # Run tests in watch mode
npm run test:verbose     # Run tests with verbose output
```

### Backend Test Coverage

The backend test suite covers:

- **Services**
  - `governanceService.js`: Tests for fetching governance actions, votes, metadata, and proposal details
  - `transactionService.js`: Tests for transaction fetching and storage
  - `blockfrostService.js`: Tests for Blockfrost API integration

- **Routes**
  - `governance.js`: Tests for governance API endpoints
  - `transactions.js`: Tests for transaction API endpoints

- **Models**
  - `GovernanceProposal.js`: Tests for MongoDB schema validation

### Backend Test Files

```
backend/__tests__/
├── services/
│   └── governanceService.test.js
├── routes/
│   ├── governance.test.js
│   └── transactions.test.js
└── models/
    └── GovernanceProposal.test.js
```

## Frontend Tests

### Running Frontend Tests

```bash
cd frontend
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage report
npm test -- --watch      # Run tests in watch mode
```

### Frontend Test Coverage

The frontend test suite covers:

- **Components**
  - `Governance.js`: Tests for governance proposal display, filtering, sorting, and modal interactions
  - `DatabaseBrowser.js`: Tests for database browsing functionality
  - `Dashboard.js`: Tests for dashboard metrics display
  - `TransactionList.js`: Tests for transaction list and pagination

### Frontend Test Files

```
frontend/src/__tests__/
└── components/
    └── Governance.test.js
```

## Test Features

### Backend Tests
- ✅ API endpoint testing with Supertest
- ✅ Service layer mocking
- ✅ MongoDB model validation
- ✅ Error handling verification
- ✅ Code coverage reporting

### Frontend Tests
- ✅ Component rendering tests
- ✅ User interaction tests (clicks, form inputs)
- ✅ API mocking with axios
- ✅ State management testing
- ✅ Async data fetching
- ✅ Error state handling

## Continuous Integration

### Pre-commit Testing

Before committing code changes, run:

```bash
# Test backend
cd backend && npm test

# Test frontend
cd frontend && npm test
```

### Test Before Push

Always ensure all tests pass before pushing to GitHub:

```bash
# From project root
cd backend && npm test && cd ../frontend && npm test
```

## Writing New Tests

### Backend Test Template

```javascript
const serviceOrRoute = require('../../path/to/module');

jest.mock('../../path/to/dependency');

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should do something', async () => {
    // Arrange
    const mockData = { /* ... */ };
    
    // Act
    const result = await serviceOrRoute.method();
    
    // Assert
    expect(result).toEqual(mockData);
  });
});
```

### Frontend Test Template

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Component from '../../components/Component';
import axios from 'axios';

jest.mock('axios');

describe('Component Name', () => {
  test('renders component', () => {
    render(<Component />);
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });
});
```

## Test Coverage Goals

- Maintain >80% code coverage for critical paths
- 100% coverage for API routes
- 100% coverage for service layer business logic
- Comprehensive component interaction testing

## Troubleshooting

### Common Issues

**Issue**: Tests fail with module not found
- **Solution**: Check import paths and ensure dependencies are installed

**Issue**: MongoDB connection errors in tests
- **Solution**: Tests use mocked MongoDB - ensure mocks are properly configured

**Issue**: Frontend tests timeout
- **Solution**: Increase timeout or check for unresolved promises

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Mocking**: Mock external dependencies clearly
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Follow AAA pattern
5. **Coverage**: Aim for high coverage but focus on critical paths
6. **Fast Tests**: Keep tests fast by mocking I/O operations

## Next Steps

- Add E2E tests with Cypress or Playwright
- Add performance testing
- Add accessibility testing
- Integrate with CI/CD pipeline
