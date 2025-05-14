# Toolio Deployment Guide

This guide explains how to deploy the Toolio application using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Access to a reverse proxy (the example uses Traefik)

## Deployment Steps

### 1. Setting Up the Deployment Directory

Create a new directory on your server to store the deployment files:

```bash
mkdir -p /srv/docker/toolio/data
cd /srv/docker/toolio
```

### 2. Create Docker Compose File

Create a [`docker-compose.yml`](./.deploy/docker-compose.example.yml) file in the `/srv/docker/toolio` directory.

### 3. Configure Environment Variables

Create a `.env` file in the `/srv/docker/toolio` directory with the necessary environment variables:

```
# Application environment variables
DB_FILE_NAME=/data/sqlite.db

# Authentication secret (generate a strong random string)
BETTER_AUTH_SECRET=your-very-secure-secret-key

# Traefik configuration
TRAEFIK_DNS=toolio
```

Make sure to replace `your-very-secure-secret-key` with a strong random string. You can generate one using:

```bash
openssl rand -base64 32
```

### 4. Start the Stack

Start the application stack:

```bash
cd /srv/docker/toolio
docker compose up -d
```

This will pull the latest Toolio image and start the container with the configuration defined in the Docker Compose file.

### 5. Run Database Migrations

After the container is running, run the database migrations:

```bash
docker compose exec astro bun run scripts/migrate.ts
```

This command will set up the database schema needed for the application to work properly.

### 6. Create Admin User

Create your first admin user with the following command:

```bash
docker compose exec astro bun run scripts/add-user.js <email> <password> "<real name>"
```

For example:

```bash
docker compose exec astro bun run scripts/add-user.js admin@example.com secure_password "Admin User"
```

The third parameter (real name) is optional but recommended.

## Updating the Application

To update to the latest version:

```bash
# Pull the latest image
cd /srv/docker/toolio
docker compose pull

# Restart the service with the new image
docker compose up -d
```

After updating, you might need to run migrations again if there are database schema changes:

```bash
docker compose exec astro bun run scripts/migrate.ts
```

## Backup and Restore

### Backup

The SQLite database file is stored in the `/srv/docker/toolio/data` directory. To back it up:

```bash
cp /srv/docker/toolio/data/sqlite.db /srv/docker/sqlite.db.backup
```

### Restore

To restore from a backup:

```bash
# Stop the container
docker compose down

# Replace the database file
cp /srv/docker/sqlite.db.backup /srv/docker/toolio/data/sqlite.db

# Start the container
docker compose up -d
```

## Troubleshooting

### Logs

View application logs:

```bash
docker compose logs -f astro
```
