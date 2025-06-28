Toolio is a collection of tools that always have an API endpoint, a Vue.js component as the frontend for that tool leveraging the API, and a documentation file associated with it in Markdown format.

## Project Structure

- **API endpoints** are stored within `/src/pages/api/` and are organized by tool (e.g., `/src/pages/api/itunes/`)
- **Tool pages/views** are stored within `/src/pages/tools/` and are organized by tool
- **Business logic** for tools is stored within `/src/lib/` and is organized by tool (e.g., `/src/lib/itunes/`)
- **Database schemas** are stored within `/src/db/schema/` (organized by feature/domain)
- **Documentation files** are stored within `/src/content/docs/` (1 Markdown file per tool)

## Key Technologies & Libraries

- **Framework**: Astro with Vue.js integration
- **UI Components**: shadcn-vue (based on reka-ui, a Vue port of Radix UI)
- **Styling**: Tailwind CSS 4 with custom design tokens
- **Database**: SQLite with Drizzle ORM
- **Authentication**: better-auth with email/password provider
- **Validation**: Zod schemas
- **Runtime**: Bun for package management and runtime
- **Deployment**: Docker
- **Package Manager**: Bun (using `bun.lock` as the lock file)

## Architecture Patterns

- Every user facing text is written in German.
- Follow DRY principles: Avoid code duplication by reusing components and utility functions.

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

## Coding Best Practices

- Use the established utility functions (e.g., `cn()` for class merging)
- Organize imports using the `@/` path alias
- Follow the existing CSS custom properties pattern for theming

## Tool Usage

- Use the `context7` tool for getting information about various libraries

## Scripts

- `bun --bun run dev`: Start the development server
- `bun --bun run build`: Build the project for production
- `bun run lint`: Run the linter
- Do not run any database scripts
