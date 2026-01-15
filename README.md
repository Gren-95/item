# ITEM

A server-side rendered application for IT Equipment Management, built with Bun, Tailwind CSS, MySQL, and Docker.

## Features

- 🔍 **Search Equipment** - Search by serial number/service tag
- 📝 **Manage Equipment** - Update equipment details
- 📍 **Location Management** - Hierarchical location selection (Region → Country → Plant → Department → Area → Sub Area)
- 🏷️ **Equipment Types** - Cascading type selection (Type → Product Line → Model)
- 👤 **Assignment Tracking** - Assign equipment to employees
- 🖥️ **TeamViewer Integration** - Track TeamViewer IDs
- 📊 **Read-only Info** - View warranty dates, device age, and equipment history

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Running the Application

1. Copy set enviroment variables
```bash 
cp .env.example .env
```

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_HOST` | MySQL host | `localhost` |
| `DATABASE_PORT` | MySQL port | `3306` |
| `DATABASE_USER` | MySQL user | `root` |
| `DATABASE_PASSWORD` | MySQL password | Uses `MYSQL_ROOT_PASSWORD` |
| `DATABASE_NAME` | Database name | `it` |
| `PORT` | Server port | `3000` |
| `BARTENDER_HOST` |Bartender printing service host| `http://localhost/`|
| `AUTH_ENDPOINT` | Authentication endpoint URL | `example...` |
| `CHANGE_PASSWORD_ENDPOINT` | Password change endpoint URL | Auto-constructed from `PMS_DB_HOST` or `example...` |
| `PMS_DB_HOST` | Database host for constructing auth endpoints | Not set |
| `HTTPS_CERT_FILE` | Path to TLS certificate (inside container) | `/app/certs/ssl.pem` |
| `HTTPS_KEY_FILE` | Path to TLS key (inside container) | `/app/certs/ssl-key.pem` |
| `HTTPS_PORT` | HTTPS port | `443` |
| `ADMIN_USERNAME` | General admin username (bypasses auth API) | Not set |
| `ADMIN_PASSWORD` | General admin password (bypasses auth API) | Not set |




2. Start all services:

```bash
docker compose up --build
```

3. Access the application:
   - **App**: http://localhost:3000
   - **phpMyAdmin**: http://localhost:8080
   - **HTTPS (optional)**: https://localhost (see HTTPS setup below)

4. Stop services:

```bash
docker compose down
```

5. Run Tests

```bash
docker compose exec app bun test
```

6. Import Mock Data (Optional)

For testing and development, you can import realistic mock data:

```bash
# Import mock data
docker compose exec app bun run import-mock-data

# Preview what would be imported (dry run)
docker compose exec app bun run import-mock-data --dry-run

# Clear existing data before importing
docker compose exec app bun run import-mock-data --clear
```

The mock data includes:
- Location hierarchy (regions, countries, plants, departments, areas, sub-areas)
- Equipment types, product lines, and models
- Vendors and suppliers
- Write-off reasons
- Inventory periods
- Sample equipment items with logs
- Employee assignments

**Note:** The script uses `ON DUPLICATE KEY UPDATE` to handle existing data gracefully. Use `--clear` to remove existing data before importing.

## HTTPS (mkcert or self-signed)

1. Generate local certificates (uses mkcert when available, otherwise OpenSSL self-signed):
```bash
docker compose exec app bun certs
```
   - Output files: `./certs/ssl.pem` and `./certs/ssl-key.pem`
   - The script installs mkcert's root CA if needed and cleans up intermediate files.

2. (Optional) Override defaults via env vars if paths differ:
```bash
export HTTPS_CERT_FILE=/app/certs/ssl.pem
export HTTPS_KEY_FILE=/app/certs/ssl-key.pem
export HTTPS_PORT=443
```

3. Start services:
```bash
docker compose up --build
```

4. Access the app over HTTPS:
```
https://localhost
```

## General Admin User

The application supports a general admin user that bypasses the external authentication API. This is useful for:
- Emergency access when the auth API is unavailable
- Local development and testing
- Initial system setup
- Recovery scenarios

### Configuration

Set the following environment variables in your `.env` file:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-in-production
```

**⚠️ Security Warning:**
- Change the default password in production environments
- Use a strong password
- Keep the `.env` file secure and never commit it to version control
- The admin user has full administrative access to all features
- Admin user access is logged for security auditing

### Admin User Capabilities

The admin user:
- Bypasses the external authentication API
- Has full administrative access to all features
- Can view and edit equipment from any plant
- Can access all pages and features
- Bypasses all permission checks
- Bypasses all plant-based restrictions

### Usage

Simply log in with the configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` credentials. The system will automatically recognize the admin user and grant full access.

