# Test Suite

This directory contains tests for the equipment audit application, covering functionality from closed issues.

## Test Structure

- `equipment.test.ts` - Tests for equipment search, add, and edit (#1, #13)
- `locations.test.ts` - Tests for locations management (#7)
- `print.test.ts` - Tests for print label API (#11)
- `pwa.test.ts` - Tests for PWA manifest (#21)
- `health.test.ts` - Tests for health check endpoint
- `validation.test.ts` - Tests for input validation schemas
- `utils.ts` - Test utilities and helpers

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test src/test/equipment.test.ts
```

## Test Coverage

These tests cover the acceptance criteria from the following closed issues:

### Issue #1: Equipment Search and Update
- ✅ Search box accepts serial number
- ✅ Equipment record display with update option
- ✅ Location, type, and assigned-to selectors
- ✅ TeamViewer field

### Issue #7: Add Locations
- ✅ Option to add new location
- ✅ Modal/form for entering location
- ✅ New location appears in list

### Issue #11: Print Equipment Labels
- ✅ Print button in audit view and editor
- ✅ POST request to Bartender API
- ✅ Printer selection

### Issue #13: Equipment Search
- ✅ Search functionality
- ✅ Redirect to edit if found
- ✅ Show add button if not found

### Issue #21: PWA Manifest
- ✅ Valid manifest.json file
- ✅ Required PWA fields (name, icons, start URL, etc.)
- ✅ Correctly linked in HTML

## Notes

- Tests use Bun's built-in test runner
- Database operations are mocked using the `MockPool` utility
- Integration tests would require a test database setup
- Some tests are structural (checking request format) rather than full integration tests
