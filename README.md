# ITEM — IT Equipment Management

Server-side-rendered tracker for IT equipment: hardware records, location
hierarchy, audits with approvals, label printing, Dell warranty lookup.

## Tech Stack

- Bun (runtime)
- MySQL via `mysql2`
- Tailwind CSS
- Playwright (E2E tests)
- Docker + Docker Compose

## Features

- Equipment search and management
- Six-level location hierarchy (Region → Country → Plant → Department → Area → Sub Area)
- Equipment type hierarchy (Type → Product Line → Model)
- Auditing with approval workflow
- Employee assignment tracking
- Dell warranty lookup
- Label printing through BarTender
- Email notifications for approvals
- Dark/light theme

## Quick Start

Requires Docker and Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Then:

- App: http://localhost:3000
- phpMyAdmin: http://localhost:8080

`docker compose down` to stop.

## Development

All commands run inside the `app` container.

```bash
docker compose exec app bun run dev          # dev server with watch
docker compose exec app bun run lint
docker compose exec app bun run format
docker compose exec app bun run migrate      # apply schema migrations
docker compose exec app bun run build:css
```

### Testing

Use `bun run test`. Plain `bun test` invokes Bun's built-in runner, which
does not understand Playwright's API and will fail to load every spec.

```bash
docker compose exec app bun run test
docker compose exec app bunx playwright test e2e/auth.spec.ts
docker compose exec app bun run test:ui
docker compose exec app sh -c "RUN_PRINTER_TESTS=true bunx playwright test e2e/printer-labels.spec.ts"
```

Printer tests are opt-in because they hit the real BarTender host.

### Mock data

```bash
docker compose exec app bun run import-mock-data
docker compose exec app bun run import-mock-data --dry-run
docker compose exec app bun run import-mock-data --clear
```

## Configuration

Environment variables. Anything marked `-` has no default; the feature is
off until you set it.

| Variable | Description | Default |
|----------|-------------|---------|
| **Database** |||
| `MYSQL_HOST` | MySQL host | `db` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_DATABASE` | Database name | `it` |
| `MYSQL_USER` | Database user | `item` |
| `MYSQL_PASSWORD` | Database password | - |
| `MYSQL_ROOT_PASSWORD` | Used by migrations that need root (e.g. CREATE DATABASE) | - |
| **Server** |||
| `PORT` | HTTP port | `3000` |
| `BASE_URL` | Base URL used in approval-email links | `http://localhost:3000` |
| **Authentication** |||
| `AUTH_ENDPOINT` | External auth API the login form posts to | - |
| `CHANGE_PASSWORD_ENDPOINT` | External password-change API | - |
| `ADMIN_USERNAME` | Admin user that bypasses the auth API | - |
| `ADMIN_PASSWORD` | Admin user's password | - |
| `TEST_MODE` | Skip the auth API; any active user logs in with any password | `false` |
| **HTTPS** |||
| `HTTPS_PORT` | HTTPS port | `443` |
| `HTTPS_CERT_FILE` | TLS certificate path | `/app/certs/ssl.pem` |
| `HTTPS_KEY_FILE` | TLS key path | `/app/certs/ssl-key.pem` |
| **Integrations** |||
| `BARTENDER_HOST` | BarTender print service URL | - |
| `DELL_CLIENT_ID` | Dell warranty API client id | - |
| `DELL_CLIENT_SECRET` | Dell warranty API client secret | - |
| **Email** |||
| `SMTP_HOST` | SMTP host. Empty disables all email | - |
| `SMTP_PORT` | SMTP port | `25` |
| `SMTP_SECURE` | Use TLS/SSL | `false` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `SMTP_FROM` | From address | `item-noreply@example.com` |
| `APPROVAL_PENDING_THRESHOLD_HOURS` | Send reminder if a pending approval is older than this. `0` disables | `0` |
| `APPROVAL_SECRET` | HMAC key for approval-link tokens. Must be at least 32 characters or token generation throws | - |
| **Testing** |||
| `RUN_PRINTER_TESTS` | Run printer specs against a real BarTender host | `false` |

### HTTPS

```bash
docker compose exec app bun run certs
```

The script generates a self-signed cert with mkcert. App is then reachable
at https://localhost.

## Code structure

`src/server.ts` is the entry point — it constructs the router, registers
each resource module, runs migrations on startup, and starts the HTTP and
HTTPS servers. The handler itself is small: build per-request context,
serve a static file if any, run the auth/CSRF preamble for non-public
paths, dispatch through the router, fall through to a 404.

Route handlers live in `src/routes/`, grouped by resource — `auth`,
`equipment`, `locations`, `equipment-types`, `vendors`, `repairs`,
`labels`, `permissions`, `approvals`, `audit`, `inventory-audit`,
`printers`, `api`, `api-crud`, plus `system` (health/version/static),
`router.ts`, `context.ts`, and `types.ts` (the framework).

Multi-handler database queries live in `src/repositories/` —
`equipment.ts`, `repairs.ts`, `management.ts` (vendors/suppliers/types/
locations/write-off-reasons), `items.ts` (the CRUD-API config table),
`approvals.ts` (the approved-action executor).

SSR templates live in `src/templates/` — one file per page plus shared
`layout.ts`, `components.ts`, `icons.ts`, `buttons.ts`, `navbar.ts`.

`src/utils/` holds cross-cutting helpers: `auth.ts` (permission checks),
`session.ts` (in-memory session store), `validation.ts` (zod schemas),
`email.ts`, `logger.ts`, `security.ts` (security headers + rate limit),
`approvals.ts`, `dell.ts`, `date.ts`.

Schema migrations are in `src/migrations/` and run on every server start.

End-to-end tests are in `e2e/`. `public/` holds CSS, JS, icons, and the
manifest.

## License

Proprietary
