import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type TrackUsageInput, type ClipboardEntry } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const trackUsage = async (input: TrackUsageInput): Promise<ClipboardEntry> => {
  try {
    // Update usage count and last_used_at timestamp atomically
    const result = await db.update(clipboardEntriesTable)
      .set({
        usage_count: sql`${clipboardEntriesTable.usage_count} + 1`,
        last_used_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(clipboardEntriesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Clipboard entry with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Usage tracking failed:', error);
    throw error;
  }
};