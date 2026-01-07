# Test Suite

This directory contains tests for the equipment audit application, covering functionality from closed issues.

## Test Structure

- `equipment.test.ts` - Tests for equipment search, add, and edit (#1, #13, #14)
- `types.test.ts` - Tests for equipment types management (#4)
- `locations.test.ts` - Tests for locations management (#7)
- `print.test.ts` - Tests for print label API (#11)
- `camera.test.ts` - Tests for camera scanning functionality (#17)
- `https.test.ts` - Tests for HTTPS support (#18)
- `database.test.ts` - Tests for database configuration (#26)
- `darkmode.test.ts` - Tests for dark mode theme (#29)
- `pwa.test.ts` - Tests for PWA manifest (#21)
- `branding.test.ts` - Tests for branding, color palette, and icons (#31)
- `health.test.ts` - Tests for health check endpoint
- `validation.test.ts` - Tests for input validation schemas
- `auth.test.ts` - Tests for authentication and permission checks
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

### Issue #17: Camera Scanning
- ✅ Scan button available in search form
- ✅ QR scanner modal opens on button click
- ✅ QR scanner library files are served

### Issue #31: Consistent Branding
- ✅ Color palette defined and documented
- ✅ Theme colors configured in HTML meta tags
- ✅ Favicon links configured correctly
- ✅ Manifest includes proper icon sizes and purposes
- ✅ Icon file structure follows consistent naming
- ✅ Modal includes camera video element
- ✅ Modal supports close and cancel actions
- ✅ Flashlight toggle support

### Issue #18: HTTPS Support
- ✅ Environment variables for certificate paths
- ✅ Graceful fallback to HTTP when certificates unavailable
- ✅ HTTP to HTTPS redirect when certificates available
- ✅ Certificate generation script exists

### Issue #26: Database Configuration
- ✅ Environment variables for database connection
- ✅ Support for internal database (Docker Compose)
- ✅ Support for external database connection
- ✅ Database initialization script exists

### Issue #29: Dark Mode
- ✅ Theme toggle button in navigation
- ✅ Theme preference saved to localStorage
- ✅ System preference detection
- ✅ Theme persists across page reloads
- ✅ Tailwind dark mode configuration

## Notes

- Tests use Bun's built-in test runner
- Database operations are mocked using the `MockPool` utility
- Integration tests would require a test database setup
- Some tests are structural (checking request format) rather than full integration tests
