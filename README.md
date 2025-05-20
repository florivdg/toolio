# Toolio

Toolio is a lightweight web application built with **Astro** and **Bun**. It uses **Vue** for interactive components, **Drizzle ORM** for database access, and **Tailwind CSS** for styling. The goal is to provide a small collection of handy tools with a simple yet modern stack.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy `.env.example` to `.env` and adjust the values.
3. Run the database migrations:

```bash
bun run db:migrate
```

4. Start the development server:

```bash
bun dev
```

The site will be available at `http://localhost:4321` by default.

### Authentication

Toolio includes basic authentication powered by **better-auth**. You can create users with:

```bash
bun run scripts/add-user.ts <email> <password> [name]
```

## Deployment

A `Dockerfile` and deployment guide are provided for container-based deployments. See [DEPLOYMENT.md](DEPLOYMENT.md) for an example Docker Compose setup and additional commands such as running migrations inside the container.
