Toolio is a collection of tools that always have an API endpoint, a Vue.js component as the frontend for that tool leveraging the API, and a documentation file associated with it in Markdown format.

This app itself is built with Astro using Vue.js components, Tailwind CSS 4 for styling, and TypeScript for type safety. Drizzle is used as the ORM for SQLite database interactions, zod for schema validation. It uses better-auth for authentication and authorization, and uses shadcn-vue (reka-ui) for the UI components.

## Project Structure

- **API endpoints** are stored within `/src/pages/api/` and are organized by tool (e.g., `/src/pages/api/itunes/`)
- **Tool pages/views** are stored within `/src/pages/tools/` and are organized by tool
- **Business logic** for tools is stored within `/src/lib/` and is organized by tool (e.g., `/src/lib/itunes/`)
- **Database schemas** are stored within `/src/db/schema/` (organized by feature/domain)
- **Documentation files** are stored within `/src/content/docs/` (1 Markdown file per tool)

## Key Technologies & Libraries

- **Framework**: Astro with Vue.js integration
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Database**: SQLite with Drizzle ORM
- **Authentication**: better-auth with email/password provider
- **UI Components**: shadcn-vue (based on reka-ui, a Vue port of Radix UI)
- **Validation**: Zod schemas
- **Runtime**: Bun for package management and runtime
- **Deployment**: Docker

## Architecture Patterns

Every user facing text is written in German.

### Authentication

Auth to all routes is handled using `better-auth` in the Astro middleware.

### Tool Structure

Each tool should follow this pattern:

```
/src/pages/api/[tool-name]/     # API endpoints
/src/pages/tools/[tool-name]/   # Frontend pages
/src/lib/[tool-name]/           # Business logic
/src/content/docs/[tool-name].md # Documentation
```

### Database Organization

- Authentication schemas in `/src/db/schema/auth.ts`
- Tool-specific schemas in `/src/db/schema/[tool-name].ts`

### Component Structure

- UI components from shadcn-vue in `/src/components/ui/` (these should never be modified)
  - Use shadcn-vue components as-is, do not modify their source code
  - These components are available for use: Sidebar, Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Checkbox, Collapsible, Combobox, Command, Context Menu, Data Table, Date Picker, Dialog, Drawer, Dropdown Menu, Form, Hover Card, Input, Label, Menubar, Navigation Menu, Number Field, Pagination, PIN Input, Popover, Progress, Radio Group, Range Calendar, Resizable, Scroll Area, Select, Separator, Sheet, Skeleton, Slider, Sonner, Stepper, Switch, Table, Tabs, Tags Input, Textarea, Toast, Toggle, Toggle Group, Tooltip
  - If not already installed, run `bunx --bun shadcn-vue@latest add <component-name>` to add the new component
- Custom components in `/src/components/`
- Layout components in `/src/layouts/`

## Coding Standards

- Use TypeScript for all code
- Validate API inputs with Zod schemas
- Follow the existing middleware pattern for authentication
- Use the established utility functions (e.g., `cn()` for class merging)
- Organize imports using the `@/` path alias
- Follow the existing CSS custom properties pattern for theming
