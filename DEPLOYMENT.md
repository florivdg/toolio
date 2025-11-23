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

# Environment (should be "production" for production deployments)
NODE_ENV=production

# Authentication secret (generate a strong random string)
BETTER_AUTH_SECRET=your-very-secure-secret-key

# Notification API key (required for notification services)
NOTI_API_KEY=your-notification-api-key

# Passkey authentication configuration (for WebAuthn)
PASSKEY_RP_ID=your-domain.com
PASSKEY_ORIGIN=https://your-domain.com

# Auto-migrations (optional - set to "true" to disable automatic migrations)
# DISABLE_AUTO_MIGRATIONS=true

# Traefik configuration
TRAEFIK_DNS=toolio
```

Make sure to replace:

- `your-very-secure-secret-key` with a strong random string
- `your-domain.com` with your actual domain name
- `https://your-domain.com` with your actual domain URL

You can generate a secure authentication secret using:

```bash
openssl rand -base64 32
```

### 4. Start the Stack

Start the application stack:

```bash
cd /srv/docker/toolio
docker compose up -d
```

This will pull the latest Toolio image and start the container with the configuration defined in the Docker Compose file. The container will automatically start both the web application and a cron daemon for scheduled tasks.

**Database migrations run automatically** when `NODE_ENV=production` is set. The migrations will execute on startup before the application starts. If you need to disable this behavior, set `DISABLE_AUTO_MIGRATIONS=true` in your environment variables.

### 5. Configure Automatic Price Updates (Optional)

Toolio includes automatic iTunes price updates that run every 6 hours. These are enabled by default when using Docker. To customize the cron schedule or server URL:

1. Set the `SERVER_URL` environment variable in your Docker Compose file:

   ```yaml
   environment:
     - SERVER_URL=https://your-domain.com # Use your actual domain
   ```

2. View cron logs to monitor price updates:
   ```bash
   docker compose exec astro tail -f /var/log/cron.log
   ```

### 6. Database Migrations (Optional)

Database migrations run automatically on container startup when `NODE_ENV=production` is set. However, if you've disabled auto-migrations with `DISABLE_AUTO_MIGRATIONS=true`, you can run them manually:

```bash
docker compose exec astro bun run db:migrate
```

This command will set up the database schema needed for the application to work properly.

### 7. Create Admin User

Create your first admin user with the following command:

```bash
docker compose exec astro bun run scripts/add-user.js <email> <password> "<real name>"
```

For example:

```bash
docker compose exec astro bun run scripts/add-user.js admin@example.com secure_password "Admin User"
```

The third parameter (real name) is optional but recommended.

### 8. Passkey Authentication Setup

Toolio supports WebAuthn passkey authentication alongside traditional email/password authentication. For passkey authentication to work properly in production:

1. Ensure your `PASSKEY_RP_ID` matches your domain (e.g., `toolio.flori.cloud`)
2. Ensure your `PASSKEY_ORIGIN` matches your full URL (e.g., `https://toolio.flori.cloud`)
3. Your site must be served over HTTPS (required for WebAuthn)
4. Users can register passkeys from their account settings after signing in with email/password

## Updating the Application

To update to the latest version:

```bash
# Pull the latest image
cd /srv/docker/toolio
docker compose pull

# Restart the service with the new image
docker compose up -d
```

Database migrations will run automatically on startup if `NODE_ENV=production` is set (which is the recommended configuration). If you have disabled auto-migrations with `DISABLE_AUTO_MIGRATIONS=true`, you'll need to run them manually after updating:

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
