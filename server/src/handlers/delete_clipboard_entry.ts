import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type BulkDeleteInput } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export async function deleteClipboardEntry(id: number): Promise<void> {
  try {
    const result = await db.delete(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, id))
      .execute();
    
    // Note: result is a ResultSet with rowCount property
    // If no rows were deleted, the entry didn't exist, but we don't throw an error
    // This follows the idempotent pattern - deleting a non-existent entry is a no-op
  } catch (error) {
    console.error('Single clipboard entry deletion failed:', error);
    throw error;
  }
}

export async function bulkDeleteClipboardEntries(input: BulkDeleteInput): Promise<number> {
  try {
    const result = await db.delete(clipboardEntriesTable)
      .where(inArray(clipboardEntriesTable.id, input.ids))
      .execute();
    
    // Return the actual number of deleted entries
    return result.rowCount || 0;
  } catch (error) {
    console.error('Bulk clipboard entries deletion failed:', error);
    throw error;
  }
}

export async function clearAllClipboardEntries(): Promise<number> {
  try {
    const result = await db.delete(clipboardEntriesTable)
      .execute();
    
    // Return the number of entries that were deleted
    return result.rowCount || 0;
  } catch (error) {
    console.error('Clear all clipboard entries failed:', error);
    throw error;
  }
}