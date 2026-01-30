FROM oven/bun:1

WORKDIR /app

# Install mkcert and dependencies for local TLS certificate generation
# Also install Playwright dependencies for E2E testing
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    procps \
    file \
    mkcert \
    libnss3-tools \
    # Playwright dependencies
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies (including devDependencies by default)
RUN bun install

# Install Playwright browsers for E2E testing
RUN bunx playwright install chromium

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Build CSS and start the server in watch mode for live reload
CMD bun run build:css && bun run dev
