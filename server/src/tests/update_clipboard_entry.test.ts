import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type UpdateClipboardEntryInput } from '../schema';
import { updateClipboardEntry } from '../handlers/update_clipboard_entry';
import { eq } from 'drizzle-orm';

describe('updateClipboardEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test clipboard entry
  const createTestEntry = async () => {
    const result = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Original content',
        title: 'Original title',
        is_pinned: false,
        is_favorite: false,
        tags: ['original', 'test'],
        usage_count: 5,
        last_used_at: new Date('2023-01-01')
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update only content field', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      content: 'Updated content'
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.id).toEqual(entry.id);
    expect(result.content).toEqual('Updated content');
    expect(result.title).toEqual('Original title'); // Unchanged
    expect(result.is_pinned).toEqual(false); // Unchanged
    expect(result.is_favorite).toEqual(false); // Unchanged
    expect(result.tags).toEqual(['original', 'test']); // Unchanged
    expect(result.usage_count).toEqual(5); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > entry.updated_at).toBe(true);
  });

  it('should update title field including null value', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      title: null
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.title).toBeNull();
    expect(result.content).toEqual('Original content'); // Unchanged
  });

  it('should update boolean fields', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      is_pinned: true,
      is_favorite: true
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.is_pinned).toEqual(true);
    expect(result.is_favorite).toEqual(true);
    expect(result.content).toEqual('Original content'); // Unchanged
  });

  it('should update tags array', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      tags: ['updated', 'new-tags', 'clipboard']
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.tags).toEqual(['updated', 'new-tags', 'clipboard']);
    expect(result.content).toEqual('Original content'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      content: 'Multi-field update',
      title: 'New title',
      is_pinned: true,
      tags: ['multi', 'update']
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.content).toEqual('Multi-field update');
    expect(result.title).toEqual('New title');
    expect(result.is_pinned).toEqual(true);
    expect(result.is_favorite).toEqual(false); // Unchanged
    expect(result.tags).toEqual(['multi', 'update']);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      content: 'Database persistence test',
      is_favorite: true
    };

    await updateClipboardEntry(updateInput);

    // Query the database directly to verify persistence
    const savedEntry = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, entry.id))
      .execute();

    expect(savedEntry).toHaveLength(1);
    expect(savedEntry[0].content).toEqual('Database persistence test');
    expect(savedEntry[0].is_favorite).toEqual(true);
    expect(savedEntry[0].updated_at).toBeInstanceOf(Date);
    expect(savedEntry[0].updated_at > entry.updated_at).toBe(true);
  });

  it('should always update the updated_at timestamp', async () => {
    const entry = await createTestEntry();
    const originalUpdateTime = entry.updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      content: 'Timestamp test'
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdateTime).toBe(true);
  });

  it('should throw error when entry not found', async () => {
    const nonExistentId = 99999;
    
    const updateInput: UpdateClipboardEntryInput = {
      id: nonExistentId,
      content: 'This should fail'
    };

    await expect(updateClipboardEntry(updateInput))
      .rejects.toThrow(/not found/i);
  });

  it('should handle empty tags array update', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      tags: []
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.tags).toEqual([]);
    expect(result.content).toEqual('Original content'); // Unchanged
  });

  it('should update with minimal input (only id and one field)', async () => {
    const entry = await createTestEntry();
    
    const updateInput: UpdateClipboardEntryInput = {
      id: entry.id,
      is_pinned: true
    };

    const result = await updateClipboardEntry(updateInput);

    expect(result.is_pinned).toEqual(true);
    expect(result.content).toEqual('Original content');
    expect(result.title).toEqual('Original title');
    expect(result.is_favorite).toEqual(false);
    expect(result.tags).toEqual(['original', 'test']);
  });
});