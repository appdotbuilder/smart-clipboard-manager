import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type BulkDeleteInput, type CreateClipboardEntryInput } from '../schema';
import { deleteClipboardEntry, bulkDeleteClipboardEntries, clearAllClipboardEntries } from '../handlers/delete_clipboard_entry';
import { eq } from 'drizzle-orm';

// Helper function to create test clipboard entries
const createTestEntry = async (content: string, title?: string): Promise<number> => {
  const result = await db.insert(clipboardEntriesTable)
    .values({
      content,
      title: title || null,
      tags: ['test']
    })
    .returning()
    .execute();
  
  return result[0].id;
};

describe('deleteClipboardEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing clipboard entry', async () => {
    // Create test entry
    const entryId = await createTestEntry('Test content for deletion');

    // Verify entry exists
    const beforeDelete = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, entryId))
      .execute();
    expect(beforeDelete).toHaveLength(1);

    // Delete the entry
    await deleteClipboardEntry(entryId);

    // Verify entry is deleted
    const afterDelete = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, entryId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should not throw error when deleting non-existent entry', async () => {
    const nonExistentId = 99999;

    // Should not throw an error (idempotent operation)
    await expect(deleteClipboardEntry(nonExistentId)).resolves.toBeUndefined();

    // Verify no entries exist with that ID (should still be empty)
    const entries = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, nonExistentId))
      .execute();
    expect(entries).toHaveLength(0);
  });

  it('should only delete the specified entry', async () => {
    // Create multiple test entries
    const entryId1 = await createTestEntry('Entry 1');
    const entryId2 = await createTestEntry('Entry 2');
    const entryId3 = await createTestEntry('Entry 3');

    // Delete only the middle entry
    await deleteClipboardEntry(entryId2);

    // Verify only the specified entry was deleted
    const remainingEntries = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    
    expect(remainingEntries).toHaveLength(2);
    const remainingIds = remainingEntries.map(entry => entry.id);
    expect(remainingIds).toContain(entryId1);
    expect(remainingIds).toContain(entryId3);
    expect(remainingIds).not.toContain(entryId2);
  });
});

describe('bulkDeleteClipboardEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testInput: BulkDeleteInput = {
    ids: [] // Will be populated in tests
  };

  it('should delete multiple clipboard entries and return count', async () => {
    // Create test entries
    const entryId1 = await createTestEntry('Bulk delete entry 1');
    const entryId2 = await createTestEntry('Bulk delete entry 2');
    const entryId3 = await createTestEntry('Bulk delete entry 3');

    // Create input for bulk delete
    const input: BulkDeleteInput = {
      ids: [entryId1, entryId3] // Delete first and third entries
    };

    // Perform bulk delete
    const deletedCount = await bulkDeleteClipboardEntries(input);

    // Verify correct count returned
    expect(deletedCount).toEqual(2);

    // Verify correct entries were deleted
    const remainingEntries = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    
    expect(remainingEntries).toHaveLength(1);
    expect(remainingEntries[0].id).toEqual(entryId2);
    expect(remainingEntries[0].content).toEqual('Bulk delete entry 2');
  });

  it('should handle partial deletion (some IDs not found)', async () => {
    // Create only some of the entries to be deleted
    const existingId1 = await createTestEntry('Existing entry 1');
    const existingId2 = await createTestEntry('Existing entry 2');
    const nonExistentId = 99999;

    const input: BulkDeleteInput = {
      ids: [existingId1, nonExistentId, existingId2]
    };

    // Should delete only the existing entries
    const deletedCount = await bulkDeleteClipboardEntries(input);

    // Should return count of actually deleted entries
    expect(deletedCount).toEqual(2);

    // Verify database is empty
    const remainingEntries = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(remainingEntries).toHaveLength(0);
  });

  it('should return zero when no entries match the IDs', async () => {
    // Create some entries but don't include their IDs in deletion
    await createTestEntry('Entry that will not be deleted');

    const input: BulkDeleteInput = {
      ids: [99998, 99999] // Non-existent IDs
    };

    const deletedCount = await bulkDeleteClipboardEntries(input);

    expect(deletedCount).toEqual(0);

    // Verify original entry is still there
    const remainingEntries = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(remainingEntries).toHaveLength(1);
    expect(remainingEntries[0].content).toEqual('Entry that will not be deleted');
  });

  it('should handle single ID in bulk delete', async () => {
    const entryId = await createTestEntry('Single entry for bulk delete');

    const input: BulkDeleteInput = {
      ids: [entryId]
    };

    const deletedCount = await bulkDeleteClipboardEntries(input);

    expect(deletedCount).toEqual(1);

    const remainingEntries = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(remainingEntries).toHaveLength(0);
  });
});

describe('clearAllClipboardEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete all clipboard entries and return count', async () => {
    // Create multiple test entries
    await createTestEntry('Entry 1', 'Title 1');
    await createTestEntry('Entry 2', 'Title 2');
    await createTestEntry('Entry 3'); // No title
    await createTestEntry('Entry 4', 'Title 4');

    // Verify entries were created
    const beforeClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(beforeClear).toHaveLength(4);

    // Clear all entries
    const deletedCount = await clearAllClipboardEntries();

    // Verify correct count returned
    expect(deletedCount).toEqual(4);

    // Verify all entries are deleted
    const afterClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(afterClear).toHaveLength(0);
  });

  it('should return zero when clearing empty database', async () => {
    // Ensure database is empty (no entries created)
    const beforeClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(beforeClear).toHaveLength(0);

    // Clear all entries
    const deletedCount = await clearAllClipboardEntries();

    // Should return 0 since no entries were deleted
    expect(deletedCount).toEqual(0);

    // Database should still be empty
    const afterClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(afterClear).toHaveLength(0);
  });

  it('should delete entries with various field combinations', async () => {
    // Create entries with different combinations of fields
    const result1 = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Pinned entry',
        title: 'Important Note',
        is_pinned: true,
        is_favorite: false,
        tags: ['work', 'important'],
        usage_count: 5
      })
      .returning()
      .execute();

    const result2 = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Favorite entry',
        title: null,
        is_pinned: false,
        is_favorite: true,
        tags: ['personal'],
        usage_count: 10
      })
      .returning()
      .execute();

    // Verify entries exist with different field values
    const beforeClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(beforeClear).toHaveLength(2);
    expect(beforeClear.some(entry => entry.is_pinned)).toBe(true);
    expect(beforeClear.some(entry => entry.is_favorite)).toBe(true);

    // Clear all entries
    const deletedCount = await clearAllClipboardEntries();

    expect(deletedCount).toEqual(2);

    // Verify all entries are deleted regardless of their field values
    const afterClear = await db.select()
      .from(clipboardEntriesTable)
      .execute();
    expect(afterClear).toHaveLength(0);
  });
});