# ITEM - IT Equipment Management

A server-side rendered application for IT equipment tracking and management.

## Tech Stack

- **Runtime:** Bun
- **Database:** MySQL
- **Styling:** Tailwind CSS
- **Testing:** Playwright (E2E)
- **Infrastructure:** Docker

## Features

- Equipment search and management
- Hierarchical location management (Region → Country → Plant → Department → Area → Sub Area)
- Equipment type hierarchy (Type → Product Line → Model)
- Auditing with approval workflows
- Employee assignment tracking
- Dell warranty integration
- Label printing (BarTender integration)
- Email notifications for approvals
- Dark/light theme support

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start services:
   ```bash
   docker compose up --build
   ```

3. Access the application:
   - **App:** http://localhost:3000
   - **phpMyAdmin:** http://localhost:8080

4. Stop services:
   ```bash
   docker compose down
   ```

## Development

### Commands

All commands run inside the Docker container:

```bash
# Start dev server with watch mode
docker compose exec app bun run dev

# Run linter
docker compose exec app bun run lint

# Format code
docker compose exec app bun run format

# Run database migrations
docker compose exec app bun run migrate

# Build Tailwind CSS
docker compose exec app bun run build:css
```

### Testing

```bash
# Run all tests (excludes printer tests)
docker compose exec app bun test

# Run specific test file
docker compose exec app bun test e2e/auth.spec.ts

# Run tests with UI
docker compose exec app bun run test:ui

# Run printer tests (requires printer infrastructure)
docker compose exec app sh -c "RUN_PRINTER_TESTS=true bun test e2e/printer-labels.spec.ts"
```

### Mock Data

Import sample data for development:

```bash
# Import mock data
docker compose exec app bun run import-mock-data

# Preview without importing
docker compose exec app bun run import-mock-data --dry-run

# Clear existing data first
docker compose exec app bun run import-mock-data --clear
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| **Database** |||
| `MYSQL_HOST` | MySQL host | `db` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_DATABASE` | Database name | `it` |
| `MYSQL_USER` | Database user | `item` |
| `MYSQL_PASSWORD` | Database password | - |
| **Server** |||
| `API_PORT` | Server port | `3000` |
| `BASE_URL` | Base URL for email links | `http://localhost:3000` |
| **Authentication** |||
| `AUTH_ENDPOINT` | External auth API URL | - |
| `ADMIN_USERNAME` | Admin username (bypasses auth) | - |
| `ADMIN_PASSWORD` | Admin password | - |
| `TEST_MODE` | Bypass auth for testing | `false` |
| **HTTPS** |||
| `HTTPS_PORT` | HTTPS port | `443` |
| `HTTPS_CERT_FILE` | TLS certificate path | `/app/certs/ssl.pem` |
| `HTTPS_KEY_FILE` | TLS key path | `/app/certs/ssl-key.pem` |
| **Integrations** |||
| `BARTENDER_HOST` | BarTender print service URL | - |
| `DELL_CLIENT_ID` | Dell API client ID | - |
| `DELL_CLIENT_SECRET` | Dell API client secret | - |
| **Email** |||
| `SMTP_HOST` | SMTP server (empty to disable) | - |
| `SMTP_PORT` | SMTP port | `25` |
| `SMTP_SECURE` | Use TLS/SSL | `false` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `SMTP_FROM` | From address | `item-noreply@example.com` |
| `APPROVAL_PENDING_THRESHOLD_HOURS` | Hours before approval reminder | `0` |
| **Testing** |||
| `RUN_PRINTER_TESTS` | Enable printer E2E tests | `false` |

### HTTPS Setup

Generate local certificates:

```bash
docker compose exec app bun run certs
```

Access via https://localhost

### Test Mode

For development without external auth:

```bash
TEST_MODE=true
```

Any username from `it_employees_list` can log in with any password.

**Warning:** Never enable in production.

### Admin User

Emergency/development access bypassing external auth:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

## Project Structure

```
src/
├── server.ts           # Main server and routes
├── db.ts               # Database connection
├── migrations/         # Database migrations
├── templates/          # HTML templates (SSR)
│   ├── layout.ts       # Base layout
│   ├── icons.ts        # SVG icons
│   ├── components.ts   # Shared components
│   └── *.ts            # Page templates
└── utils/              # Utilities
    ├── auth.ts         # Authentication
    ├── session.ts      # Session management
    ├── email.ts        # Email notifications
    └── validation.ts   # Input validation

e2e/                    # Playwright E2E tests
public/                 # Static assets
```

## License

Proprietary
