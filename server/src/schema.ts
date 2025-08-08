import { z } from 'zod';

// Clipboard entry schema
export const clipboardEntrySchema = z.object({
  id: z.number(),
  content: z.string(),
  title: z.string().nullable(), // Optional title for the clipboard entry
  is_pinned: z.boolean(),
  is_favorite: z.boolean(),
  tags: z.array(z.string()), // Array of tags for categorization
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  usage_count: z.number().int().nonnegative(), // Track how often this entry is used
  last_used_at: z.coerce.date().nullable() // When was this entry last accessed
});

export type ClipboardEntry = z.infer<typeof clipboardEntrySchema>;

// Input schema for creating clipboard entries
export const createClipboardEntryInputSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  title: z.string().nullable().optional(), // Optional title
  tags: z.array(z.string()).default([]) // Default to empty array
});

export type CreateClipboardEntryInput = z.infer<typeof createClipboardEntryInputSchema>;

// Input schema for updating clipboard entries
export const updateClipboardEntryInputSchema = z.object({
  id: z.number(),
  content: z.string().min(1, "Content cannot be empty").optional(),
  title: z.string().nullable().optional(),
  is_pinned: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

export type UpdateClipboardEntryInput = z.infer<typeof updateClipboardEntryInputSchema>;

// Search parameters schema
export const searchClipboardInputSchema = z.object({
  query: z.string().optional(), // Text search query
  tags: z.array(z.string()).optional(), // Filter by specific tags
  is_pinned: z.boolean().optional(), // Filter by pinned status
  is_favorite: z.boolean().optional(), // Filter by favorite status
  limit: z.number().int().positive().max(100).default(50), // Limit results
  offset: z.number().int().nonnegative().default(0) // For pagination
});

export type SearchClipboardInput = z.infer<typeof searchClipboardInputSchema>;

// Usage tracking input schema
export const trackUsageInputSchema = z.object({
  id: z.number()
});

export type TrackUsageInput = z.infer<typeof trackUsageInputSchema>;

// Bulk operations input schema
export const bulkDeleteInputSchema = z.object({
  ids: z.array(z.number()).min(1, "At least one ID required")
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteInputSchema>;

// Statistics schema
export const clipboardStatsSchema = z.object({
  total_entries: z.number().int(),
  pinned_entries: z.number().int(),
  favorite_entries: z.number().int(),
  total_tags: z.number().int(),
  most_used_entry: clipboardEntrySchema.nullable(),
  recent_entries: z.array(clipboardEntrySchema)
});

export type ClipboardStats = z.infer<typeof clipboardStatsSchema>;