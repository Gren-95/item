# Equipment Audit System

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

1. Start all services:

```bash
docker-compose up -d
```

2. Access the application:
   - **App**: http://localhost:3000
   - **phpMyAdmin**: http://localhost:8080

3. Stop services:

```bash
docker-compose down
```

## Development

### Local Development (without Docker)

1. Install Bun: https://bun.sh

2. Install dependencies:

```bash
bun install
```

3. Build Tailwind CSS:

```bash
bun run build:css
```

4. Set environment variables:

```bash
export DATABASE_HOST=localhost
export DATABASE_PORT=3306
export DATABASE_USER=ims_user
export DATABASE_PASSWORD=ims_password
export DATABASE_NAME=ims
```

5. Run the development server:

```bash
bun run dev
```

## Project Structure

```
├── docker-compose.yml    # Docker services configuration
├── Dockerfile            # App container configuration
├── db.sql                # Database schema
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── public/
│   └── css/              # Compiled CSS
└── src/
    ├── server.ts         # Main server entry point
    ├── db.ts             # Database connection pool
    ├── styles/
    │   └── input.css     # Tailwind source CSS
    └── templates/
        ├── layout.ts     # Base HTML layout
        ├── search.ts     # Search page template
        └── audit.ts      # Audit form template
```

## Database

The application uses MySQL with the following main tables:

- `it_equipment` - Main equipment records
- `it_equipment_audit` - Audit history
- `it_equipment_type/product_line/model` - Equipment classification
- `it_equipment_region/country/plant/department/area/sub_area` - Location hierarchy
- `it_employees_list` - Employee records

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_HOST` | MySQL host | `localhost` |
| `DATABASE_PORT` | MySQL port | `3306` |
| `DATABASE_USER` | MySQL user | `ims_user` |
| `DATABASE_PASSWORD` | MySQL password | `ims_password` |
| `DATABASE_NAME` | Database name | `ims` |
| `PORT` | Server port | `3000` |
