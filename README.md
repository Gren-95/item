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
| `TEST_MODE` | Enable test mode for authentication (bypasses auth API) | `false` |
| `AUTH_ENDPOINT` | Authentication endpoint URL | `example...` |
| `CHANGE_PASSWORD_ENDPOINT` | Password change endpoint URL | Auto-constructed from `PMS_DB_HOST` or `example...` |
| `PMS_DB_HOST` | Database host for constructing auth endpoints | Not set |
| `HTTPS_CERT_FILE` | Path to TLS certificate (inside container) | `/app/certs/ssl.pem` |
| `HTTPS_KEY_FILE` | Path to TLS key (inside container) | `/app/certs/ssl-key.pem` |
| `HTTPS_PORT` | HTTPS port | `443` |
| `ADMIN_USERNAME` | General admin username (bypasses auth API) | Not set |
| `ADMIN_PASSWORD` | General admin password (bypasses auth API) | Not set |
| `SMTP_HOST` | SMTP server hostname for email notifications | Not set |
| `SMTP_PORT` | SMTP server port | `25` |
| `SMTP_SECURE` | Use TLS/SSL for SMTP (`true` or `false`) | `false` |
| `SMTP_USER` | SMTP authentication username | Not set |
| `SMTP_PASSWORD` | SMTP authentication password | Not set |
| `SMTP_FROM` | From address for notification emails | `item-noreply@example.com` |
| `BASE_URL` | Base URL for links in emails | `http://localhost:3000` |
| `APPROVAL_PENDING_THRESHOLD_HOURS` | Hours before sending reminder for pending approvals (0 to disable) | `0` |
| `RUN_PRINTER_TESTS` | Enable printer-related E2E tests (requires printer infrastructure) | `false` |




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
# Run all tests (excludes printer tests by default)
docker compose exec app bun test

# Run printer tests (requires printer infrastructure)
docker compose exec app sh -c "RUN_PRINTER_TESTS=true bun test e2e/printer-labels.spec.ts"
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

## Test Mode Authentication

The application supports test mode authentication for development and testing environments. When enabled, users can log in without requiring the external authentication API.

### Configuration

Set the following environment variable in your `.env` file:

```bash
TEST_MODE=true
```

### How It Works

When `TEST_MODE=true`:
- The application bypasses the external authentication API
- Any username that exists in the `it_employees_list` table (in either `employee_no` or `user_id` columns) can log in
- **The password is not validated** - any password will work for existing users
- Authentication is checked directly against the database

**⚠️ Security Warning:**
- **NEVER enable TEST_MODE in production environments**
- This mode completely bypasses password validation
- Only use for local development, testing, or CI/CD environments
- Ensure your database is not exposed to the internet when TEST_MODE is enabled

### Usage

1. Enable TEST_MODE in your `.env`:
   ```bash
   TEST_MODE=true
   ```

2. Log in with any username that exists in `it_employees_list`:
   - Use the `employee_no` or `user_id` value as the username
   - Any password will be accepted

3. The system will authenticate the user if found in the database

### Use Cases

- **Local Development**: No need to set up external auth API
- **Automated Testing**: Simplifies test user authentication in CI/CD
- **Offline Development**: Work without network access to auth services
- **Database Testing**: Test with real user data from the database

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

## Email Notifications

The application can send email notifications to administrators for approval requests. Email notifications are entirely optional and the system works normally without them.

### Features

- **New Approval Requests**: Automatically notifies admins when new approval requests are submitted
- **Pending Reminders**: Sends reminder emails for approval requests that have been pending longer than the configured threshold
- **Decision Notifications**: Notifies admins when approvals are approved or rejected

### Configuration

Email notifications are configured via environment variables in your `.env` file:

```bash
# SMTP Configuration for Email Notifications
# Leave SMTP_HOST empty to disable email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=item-noreply@example.com

# Base URL for email links (used in approval notification emails)
BASE_URL=http://localhost:3000

# Approval notification settings
# Send reminder emails for pending approvals older than this many hours (0 to disable)
APPROVAL_PENDING_THRESHOLD_HOURS=24
```

### SMTP Options

- **Secure Mode (TLS/SSL)**: Set `SMTP_SECURE=true` for encrypted connections
  - Port 465 is typically used for SSL
  - Port 587 is typically used for STARTTLS
- **Insecure Mode**: Set `SMTP_SECURE=false` for unencrypted connections (useful for internal/legacy mail servers)
- **Authentication**: Provide `SMTP_USER` and `SMTP_PASSWORD` if your SMTP server requires authentication

### Setup Validation

On server startup, the application automatically validates the SMTP configuration and tests the connection. Check the console output for:

```
✅ Email notifications enabled and SMTP connection verified
   SMTP Host: smtp.example.com:25
   Secure: No
   From: item-noreply@example.com
```

If SMTP is not configured or the connection fails:

```
⚠️  Email notifications disabled: SMTP_HOST not configured
```

or

```
❌ SMTP connection failed: [error message]
   Email notifications will be disabled
```

### Notification Recipients

Email notifications are sent to administrators based on their permissions:
- Admins are identified by their role in the `it_user_permissions` table
- Only admins with the required permission for the approval type receive notifications
- Both plant-specific and global admins (plant_id = 0) receive notifications

### Pending Approval Reminders

The system automatically checks for pending approvals every hour and sends reminder emails for requests older than `APPROVAL_PENDING_THRESHOLD_HOURS`:
- Set to `24` to send reminders for approvals pending more than 24 hours
- Set to `0` to disable reminder emails entirely
- The scheduler runs automatically in the background

### Troubleshooting

- **No emails received**: Check that `SMTP_HOST` is configured and the SMTP connection test passed on startup
- **Wrong recipients**: Verify admin users have the correct permissions in the `it_user_permissions` table
- **Connection errors**: Check firewall rules and network connectivity to your SMTP server
- **Authentication failures**: Verify `SMTP_USER` and `SMTP_PASSWORD` are correct

