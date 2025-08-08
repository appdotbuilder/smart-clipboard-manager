import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type UpdateClipboardEntryInput, type ClipboardEntry } from '../schema';
import { eq } from 'drizzle-orm';

export const updateClipboardEntry = async (input: UpdateClipboardEntryInput): Promise<ClipboardEntry> => {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof clipboardEntriesTable.$inferInsert> = {
      updated_at: new Date() // Always update the timestamp
    };

    // Only include fields that were provided in the input
    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.is_pinned !== undefined) {
      updateData.is_pinned = input.is_pinned;
    }

    if (input.is_favorite !== undefined) {
      updateData.is_favorite = input.is_favorite;
    }

    if (input.tags !== undefined) {
      updateData.tags = input.tags;
    }

    // Update the entry in the database
    const result = await db.update(clipboardEntriesTable)
      .set(updateData)
      .where(eq(clipboardEntriesTable.id, input.id))
      .returning()
      .execute();

    // Check if entry was found and updated
    if (result.length === 0) {
      throw new Error(`Clipboard entry with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Clipboard entry update failed:', error);
    throw error;
  }
};