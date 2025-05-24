import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// Define the docs collection for tool documentation
const docs = defineCollection({
  // Use glob loader to load all markdown files from src/content/docs/
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  // Define schema for documentation frontmatter
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
})

// Export collections object to register the collection
export const collections = {
  docs,
}
