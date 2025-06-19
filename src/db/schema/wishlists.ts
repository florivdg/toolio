import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { randomUUID } from 'node:crypto'

// Wishlists table
export const wishlists = sqliteTable('wishlists', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// Wishlist items table
export const wishlistItems = sqliteTable('wishlist_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  wishlistId: text('wishlist_id')
    .notNull()
    .references(() => wishlists.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price'),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isPurchased: integer('is_purchased', { mode: 'boolean' })
    .notNull()
    .default(false),
  priority: integer('priority').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// Relations
export const wishlistsRelations = relations(wishlists, ({ many }) => ({
  items: many(wishlistItems),
}))

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id],
  }),
}))

// Zod schemas
export const wishlistSchema = createInsertSchema(wishlists)
export const wishlistItemSchema = createInsertSchema(wishlistItems)

// Infer types
export type Wishlist = typeof wishlists.$inferInsert
export type WishlistItem = typeof wishlistItems.$inferInsert
