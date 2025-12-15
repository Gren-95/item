# ITEM

A server-side rendered application for auditing IT equipment, built with Bun, Tailwind CSS, MySQL, and Docker.

## Features

- 🔍 **Search Equipment** - Search by serial number/service tag
- 📝 **Audit Equipment** - Update equipment details during audits
- 📍 **Location Management** - Hierarchical location selection (Region → Country → Plant → Department → Area → Sub Area)
- 🏷️ **Equipment Types** - Cascading type selection (Type → Product Line → Model)
- 👤 **Assignment Tracking** - Assign equipment to employees
- 🖥️ **TeamViewer Integration** - Track TeamViewer IDs
- 📊 **Read-only Info** - View warranty dates, device age, and audit history

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
| `DATABASE_USER` | MySQL user | `ims_user` |
| `DATABASE_PASSWORD` | MySQL password | `ims_password` |
| `DATABASE_NAME` | Database name | `ims` |
| `PORT` | Server port | `3000` |
| `BARTENDER_HOST` |Bartender printing service host| `http://localhost/`|
| `HTTPS_CERT_FILE` | Path to TLS certificate (inside container) | `/app/certs/ssl.pem` |
| `HTTPS_KEY_FILE` | Path to TLS key (inside container) | `/app/certs/ssl-key.pem` |
| `HTTPS_PORT` | HTTPS port | `443` |




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

