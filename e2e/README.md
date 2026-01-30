# E2E Test Suite

This directory contains Playwright end-to-end tests for the equipment audit application.

**237 tests** covering equipment management, authentication, permissions, branding, warranties, and user workflows.

## Test Structure

| File | Description | Related Issues |
|------|-------------|----------------|
| `health.spec.ts` | Health check, PWA manifest, static assets | #21 |
| `equipment.spec.ts` | Equipment search, add, edit functionality | #1, #13, #14 |
| `types.spec.ts` | Equipment types, product lines, models management | #3, #4, #36 |
| `locations.spec.ts` | Location hierarchy management | #7 |
| `vendors.spec.ts` | Vendors, write-off reasons | #5, #8 |
| `suppliers.spec.ts` | Suppliers management, repairs tracking | #6, #28 |
| `print.spec.ts` | Print label functionality with Bartender | #11 |
| `camera.spec.ts` | QR code camera scanning | #17 |
| `auth.spec.ts` | Authentication, permissions, plant access | #12, #40, #44 |
| `branding.spec.ts` | Branding, icons, color palette | #31, #45 |
| `darkmode.spec.ts` | Dark mode theme toggle and persistence | #29 |
| `dell.spec.ts` | Dell warranty API integration | #16 |
| `audit.spec.ts` | Equipment auditing, log search | #2, #10 |
| `pc-passwords.spec.ts` | PC passwords management and printing | #43 |
| `validation.spec.ts` | Input validation across all forms | - |
| `user-flows.spec.ts` | Complete user workflows (login, search, add, edit) | - |
| `fixtures.ts` | Test utilities and helper functions | - |

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests with visible browser
npm run test:headed

# Run tests in debug mode
npm run test:debug

# View test report
npm run test:report

# Run specific test file
npx playwright test e2e/equipment.spec.ts

# Run tests matching a pattern
npx playwright test -g "search"
```

## Test Coverage by Issue

### Issue #1: Equipment Search and Update
- Search box accepts various query types (service tag, user, location, type)
- Equipment record display with update functionality
- Location, type, and assigned-to selectors
- TeamViewer and IP address fields

### Issue #4: Equipment Types Management
- Type hierarchy: Type → Product Line → Model
- Add, edit, activate/deactivate types
- Validation for name length (max 25 characters)

### Issue #5: Vendors Management
- Vendor CRUD operations
- Equipment count display
- Name validation (max 255 characters)

### Issue #7: Locations Management
- Location hierarchy: Region → Country → Plant → Department → Area → Sub Area
- Add, edit, activate/deactivate locations
- Cascading selection in equipment forms

### Issue #8: Write-off Reasons
- Write-off reason management
- Integration with equipment disposal

### Issue #11: Print Equipment Labels
- Print button in equipment views
- Bartender API integration
- Printer selection

### Issue #12: Permission API Endpoints
- `/api/check-permission` - Permission verification
- `/api/permissions/expiring` - Expiring permissions
- `/api/permissions/audit-log` - Permission change audit

### Issue #13: Equipment Search Enhancements
- Multi-field search (service tag, user, location, type)
- Search results display
- "Not found" handling

### Issue #14: Equipment Edit
- Pre-populated edit forms
- Comment and assignment updates

### Issue #17: Camera QR Scanning
- Scan button with modal
- Video element for camera
- Flashlight toggle
- Close/cancel functionality

### Issue #18: HTTPS Support
- Certificate configuration (tested via infrastructure)

### Issue #21: PWA Manifest
- Valid manifest.json with required fields
- Icons with proper sizes (192x192, 512x512)
- Maskable icon purpose
- Theme and background colors

### Issue #26: Database Configuration
- Environment variable support (tested via infrastructure)

### Issue #29: Dark Mode
- Theme toggle button
- localStorage persistence
- System preference detection
- Tailwind dark mode classes

### Issue #31: Consistent Branding
- Primary blue color (#2563eb)
- Meta theme-color tag
- Favicon and apple-touch-icon
- Icon sizes and purposes

### Issue #40: Login Form Autocomplete
- Autocomplete attributes on login fields

### Issue #44: Plant-Based Access Control
- Plant selection in permissions
- Expiry date support
- Filtered search results

### Issue #45: Icon Configuration
- Consistent icon naming
- All required sizes present

### Issue #2: Equipment Auditing
- Audit page with search box
- Serial number search
- Location, type, assigned-to selectors
- Read-only audit date, warranty dates, device age
- TeamViewer field support

### Issue #6: Suppliers Management
- Supplier CRUD operations
- Supplier fields (name, email, phone, SAP vendor number)
- Supplier selection in equipment forms
- Integration with vendors page

### Issue #10: Equipment Log Search
- Equipment log API endpoint
- History entries for equipment
- Pagination support
- Date range filtering

### Issue #16: Dell Warranty Integration
- Dell warranty API endpoint
- Service tag validation
- Warranty suggestion UI
- Device age display
- Warranty status indicators

### Issue #28: Supplier Repairs Tracking
- Repairs page and API
- Equipment repair status
- Repair notes and physical location
- Supplier repair workflow

### Issue #43: PC Passwords Management
- PC passwords page with permissions
- Password table (user, evocon, password, status)
- Add/edit/delete functionality
- Barcode label printing API
- Navigation with permission-based visibility

## Test Fixtures

The `fixtures.ts` file provides:

- **Test credentials**: `TEST_ADMIN_USER`, `TEST_USER`
- **Authentication helpers**: `login()`, `logout()`
- **Navigation helpers**: `searchEquipment()`, `goToAddEquipment()`, `goToEditEquipment()`
- **Form helpers**: `fillEquipmentForm()`
- **Utility functions**: `generateUniqueId()`, `waitForToast()`

## CI/CD Integration

Tests are configured to run in CI with:
- Headless browser execution
- Retries on failure (2 retries in CI)
- Single worker for stability
- HTML report generation

## Configuration

See `playwright.config.ts` for:
- Base URL configuration
- Browser settings (Chromium)
- Web server auto-start
- Trace and screenshot settings
