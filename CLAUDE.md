# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `bun --bun run dev` - Start development server (Astro dev mode)
- `bun --bun run build` - Build for production
- `bun --bun run preview` - Preview production build

### Code Quality

- `bun run lint` - Run oxlint for code linting

### Database

- `bun run db:generate` - Generate database migrations with drizzle-kit
- `bun run db:migrate` - Apply database migrations
- **Note**: Do not run database scripts, this is handled by the user.

### Authentication

- `bun run scripts/add-user.ts <email> <password> [name]` - Create new users

## Architecture Overview

### Tech Stack

- **Framework**: Astro 5.x with SSR, using Vue 3 for interactive islands
- **Package Manager**: Bun (use `bun` not `npm` or `yarn`)
- **Runtime**: Bun (using `bun.lock` for package management)
- **Database**: SQLite with Drizzle ORM
- **Authentication**: better-auth with email/password
- **State Management**: Pinia with Pinia Colada for query management
- **UI Components**: shadcn-vue (Vue port of Reka UI, formerly Radix Vue)
- **Styling**: Tailwind CSS 4 with custom design tokens from shadcn-vue
- **Validation**: Zod schemas
- **HTTP Client**: ofetch
- **Language**: TypeScript with strict mode
- **Internationalization**: All user-facing text must be in German

### Project Structure

Each tool follows a consistent pattern:

```
/src/pages/api/[tool-name]/      # REST API endpoints
/src/pages/tools/[tool-name]/    # Frontend pages
/src/lib/[tool-name]/            # Business logic
/src/components/[tool-name]/     # Tool-specific components
/src/content/docs/[tool-name].md # Documentation
```

Database schemas:

- `/src/db/schema/auth.ts` - Authentication schemas
- `/src/db/schema/[tool-name].ts` - Tool-specific schemas

### Key Patterns

1. **Component Usage**:

   - Never modify files in `/src/components/ui/` - these are shadcn-vue components
   - To add new shadcn-vue components: `bunx --bun shadcn-vue@latest add <component-name>`
   - Build custom components on top of shadcn-vue primitives

2. **State Management**:

   - Use Pinia stores for complex state
   - Use Pinia Colada for async operations with built-in caching

3. **API Development**:

   - Validate inputs with Zod schemas
   - Use drizzle-zod for database schema validation
   - Always infer types from Zod schemas
   - Return consistent error responses

4. **Authentication**:

   - Handled via Astro middleware using better-auth
   - All routes are protected by default

5. **Imports**:
   - Use `@/` path alias for src directory imports
   - Example: `import { cn } from '@/lib/utils'`

### Code Standards

1. **Formatting**:

   - No semicolons
   - Single quotes
   - 2 space indentation
   - Trailing commas
   - 80 character line width

2. **Best Practices**:

   - Follow DRY principles
   - Use existing utility functions (e.g., `cn()` for class merging)
   - Prefer editing existing files and functions over creating new ones
   - All user-facing text must be in German

3. **Testing**:
   - Currently no testing framework is configured
   - When implementing tests, check with user for preferred framework

### Development Workflow

1. When adding a new tool:

   - Create API endpoints in `/src/pages/api/[tool-name]/`
   - Create frontend pages in `/src/pages/tools/[tool-name]/`
   - Add business logic in `/src/lib/[tool-name]/`
   - Add documentation in `/src/content/docs/[tool-name].md`
   - Create database schema if needed in `/src/db/schema/[tool-name].ts`

2. When modifying components:

   - Never edit shadcn-vue components directly
   - Create wrapper components if customization is needed
   - Follow existing component patterns

3. Database changes:
   - Modify schema files
   - Do NOT run database scripts, this is handled by the user

### External Resources

Use the `context7` tool to get up-to-date documentation for libraries used in this project.
