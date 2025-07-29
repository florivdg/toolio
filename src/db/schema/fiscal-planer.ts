import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { randomUUID } from 'node:crypto'
import { user } from './auth'

// Fiscal plans table - represents a financial plan for a specific month/year
export const fiscalPlans = sqliteTable(
  'fiscal_plans',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(),
    notes: text('notes'),
    isArchived: integer('is_archived', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [index('fiscal_plans_date_idx').on(table.year, table.month)],
)

// Planned transactions table - individual income/expense entries in a plan
export const plannedTransactions = sqliteTable(
  'planned_transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planId: text('plan_id')
      .notNull()
      .references(() => fiscalPlans.id, { onDelete: 'cascade' }),
    templateId: text('template_id').references(() => transactionTemplates.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    amount: real('amount').notNull().default(0),
    dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
    categoryId: text('category_id'), // For future category feature
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('planned_transactions_user_idx').on(table.userId),
    index('planned_transactions_plan_idx').on(table.planId),
    index('planned_transactions_due_date_idx').on(table.dueDate),
  ],
)

// Transaction templates table - recurring transaction patterns
export const transactionTemplates = sqliteTable(
  'transaction_templates',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    amount: real('amount').notNull().default(0),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    categoryId: text('category_id'), // For future category feature
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    // Recurrence configuration
    recurrenceType: text('recurrence_type', {
      enum: ['monthly', 'yearly', 'specific_months'],
    }).notNull(),
    dayOfMonth: integer('day_of_month'), // 1-31, null means last day of month
    specificMonths: text('specific_months'), // JSON array of months [1-12]
    description: text('description'), // Human-readable description
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('transaction_templates_user_idx').on(table.userId),
    index('transaction_templates_active_idx').on(table.isActive),
  ],
)

// Relations
export const fiscalPlansRelations = relations(fiscalPlans, ({ many }) => ({
  transactions: many(plannedTransactions),
}))

export const plannedTransactionsRelations = relations(
  plannedTransactions,
  ({ one }) => ({
    user: one(user, {
      fields: [plannedTransactions.userId],
      references: [user.id],
    }),
    plan: one(fiscalPlans, {
      fields: [plannedTransactions.planId],
      references: [fiscalPlans.id],
    }),
    template: one(transactionTemplates, {
      fields: [plannedTransactions.templateId],
      references: [transactionTemplates.id],
    }),
  }),
)

export const transactionTemplatesRelations = relations(
  transactionTemplates,
  ({ one, many }) => ({
    user: one(user, {
      fields: [transactionTemplates.userId],
      references: [user.id],
    }),
    generatedTransactions: many(plannedTransactions),
  }),
)

// Zod schemas with custom validations
export const fiscalPlanSchema = createInsertSchema(fiscalPlans, {
  month: (schema) => schema.min(1).max(12),
  year: (schema) => schema.min(2000).max(2100),
})

export const plannedTransactionSchema = createInsertSchema(plannedTransactions)

export const transactionTemplateSchema = createInsertSchema(
  transactionTemplates,
  {
    dayOfMonth: (schema) => schema.min(1).max(31),
    specificMonths: (schema) =>
      schema.refine(
        (val) => {
          if (!val) return true
          try {
            const months = JSON.parse(val)
            return (
              Array.isArray(months) &&
              months.every((m) => typeof m === 'number' && m >= 1 && m <= 12)
            )
          } catch {
            return false
          }
        },
        {
          message:
            'specificMonths must be a JSON array of month numbers (1-12)',
        },
      ),
  },
)

// Infer types
export type FiscalPlan = typeof fiscalPlans.$inferInsert
export type PlannedTransaction = typeof plannedTransactions.$inferInsert
export type TransactionTemplate = typeof transactionTemplates.$inferInsert

// Helper type for parsed template with months array
export type TransactionTemplateWithMonths = Omit<
  TransactionTemplate,
  'specificMonths'
> & {
  specificMonths: number[] | null
}
