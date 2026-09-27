import { pgTable, uuid, text, numeric, varchar, timestamp, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const transfers = pgTable(
    'transfers',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: text('user_id').notNull(),
        fromAccountId: uuid('from_account_id').notNull(),
        toAccountId: uuid('to_account_id').notNull(),
        amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 10 }).default('ETB').notNull(),
        exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }).default('1.0'),
        transferredAmount: numeric('transferred_amount', { precision: 15, scale: 2 }),
        fee: numeric('fee', { precision: 15, scale: 2 }).default('0.00'),
        feeAccountId: uuid('fee_account_id'),
        description: text('description'),
        transferDate: timestamp('transfer_date', { withTimezone: true })
            .defaultNow()
            .notNull(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        differentAccountsCheck: check('check_different_accounts', sql`${table.fromAccountId} <> ${table.toAccountId}`),
    })
)

export const assets = pgTable('assets', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'real_estate', 'vehicle', 'investment', 'crypto', 'savings', 'other'
    value: numeric('value', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('ETB').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const netWorthSnapshots = pgTable('net_worth_snapshots', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    totalNetWorth: numeric('total_net_worth', { precision: 14, scale: 2 }).notNull(),
    totalAssets: numeric('total_assets', { precision: 14, scale: 2 }).notNull(),
    liquidAssets: numeric('liquid_assets', { precision: 14, scale: 2 }).notNull(),
    manualAssets: numeric('manual_assets', { precision: 14, scale: 2 }).notNull(),
    totalLiabilities: numeric('total_liabilities', { precision: 14, scale: 2 }).notNull(),
    snapshotDate: timestamp('snapshot_date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})