import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type CreateClipboardEntryInput, type ClipboardEntry } from '../schema';

export const createClipboardEntry = async (input: CreateClipboardEntryInput): Promise<ClipboardEntry> => {
  try {
    // Insert clipboard entry record
    const result = await db.insert(clipboardEntriesTable)
      .values({
        content: input.content,
        title: input.title || null,
        tags: input.tags, // JSON array handled directly by Drizzle
        is_pinned: false, // Default value
        is_favorite: false, // Default value
        usage_count: 0, // Default value
        last_used_at: null // Default value
        // created_at and updated_at are handled by database defaults
      })
      .returning()
      .execute();

    // Return the created entry
    const entry = result[0];
    return entry;
  } catch (error) {
    console.error('Clipboard entry creation failed:', error);
    throw error;
  }
};