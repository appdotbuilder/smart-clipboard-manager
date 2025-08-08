import { serial, text, pgTable, timestamp, boolean, integer, json } from 'drizzle-orm/pg-core';

export const clipboardEntriesTable = pgTable('clipboard_entries', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  title: text('title'), // Nullable by default, matches Zod schema
  is_pinned: boolean('is_pinned').notNull().default(false),
  is_favorite: boolean('is_favorite').notNull().default(false),
  tags: json('tags').$type<string[]>().notNull().default([]), // JSON array of strings
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  usage_count: integer('usage_count').notNull().default(0), // Track usage frequency
  last_used_at: timestamp('last_used_at'), // Nullable timestamp for last access
});

// TypeScript types for the table schema
export type ClipboardEntry = typeof clipboardEntriesTable.$inferSelect; // For SELECT operations
export type NewClipboardEntry = typeof clipboardEntriesTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  clipboardEntries: clipboardEntriesTable 
};