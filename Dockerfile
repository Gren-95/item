FROM oven/bun:1

WORKDIR /app

# Install mkcert and dependencies for local TLS certificate generation
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
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies (including devDependencies by default)
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Build CSS and start the server
CMD bun run build:css && bun run start
