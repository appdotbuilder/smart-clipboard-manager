import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type TrackUsageInput } from '../schema';
import { trackUsage } from '../handlers/track_usage';
import { eq } from 'drizzle-orm';

describe('trackUsage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should increment usage count and update last_used_at', async () => {
    // Create test clipboard entry
    const [createdEntry] = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Test content',
        title: 'Test title',
        tags: ['test', 'example'],
        usage_count: 5
      })
      .returning()
      .execute();

    const testInput: TrackUsageInput = {
      id: createdEntry.id
    };

    const result = await trackUsage(testInput);

    // Verify usage count was incremented
    expect(result.usage_count).toEqual(6);
    expect(result.last_used_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify other fields remain unchanged
    expect(result.id).toEqual(createdEntry.id);
    expect(result.content).toEqual('Test content');
    expect(result.title).toEqual('Test title');
    expect(result.tags).toEqual(['test', 'example']);
    expect(result.is_pinned).toEqual(false);
    expect(result.is_favorite).toEqual(false);
  });

  it('should update database record with new usage stats', async () => {
    // Create test clipboard entry
    const [createdEntry] = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Database test content',
        usage_count: 10,
        last_used_at: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const testInput: TrackUsageInput = {
      id: createdEntry.id
    };

    const beforeTracking = new Date();
    await trackUsage(testInput);

    // Query database to verify changes were persisted
    const [updatedEntry] = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, createdEntry.id))
      .execute();

    expect(updatedEntry.usage_count).toEqual(11);
    expect(updatedEntry.last_used_at).toBeInstanceOf(Date);
    expect(updatedEntry.last_used_at!.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
    expect(updatedEntry.updated_at.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
  });

  it('should work with entry that has never been used', async () => {
    // Create entry with default usage_count (0) and no last_used_at
    const [createdEntry] = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Never used content'
        // usage_count defaults to 0, last_used_at defaults to null
      })
      .returning()
      .execute();

    const testInput: TrackUsageInput = {
      id: createdEntry.id
    };

    const result = await trackUsage(testInput);

    expect(result.usage_count).toEqual(1);
    expect(result.last_used_at).toBeInstanceOf(Date);
    expect(result.content).toEqual('Never used content');
  });

  it('should handle multiple consecutive usage tracking calls', async () => {
    // Create test entry
    const [createdEntry] = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Multiple usage test',
        usage_count: 0
      })
      .returning()
      .execute();

    const testInput: TrackUsageInput = {
      id: createdEntry.id
    };

    // Track usage multiple times
    const result1 = await trackUsage(testInput);
    expect(result1.usage_count).toEqual(1);

    const result2 = await trackUsage(testInput);
    expect(result2.usage_count).toEqual(2);

    const result3 = await trackUsage(testInput);
    expect(result3.usage_count).toEqual(3);

    // Verify final state in database
    const [finalEntry] = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, createdEntry.id))
      .execute();

    expect(finalEntry.usage_count).toEqual(3);
  });

  it('should throw error for non-existent entry', async () => {
    const testInput: TrackUsageInput = {
      id: 99999 // Non-existent ID
    };

    await expect(trackUsage(testInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve all entry fields during update', async () => {
    // Create entry with all fields populated
    const [createdEntry] = await db.insert(clipboardEntriesTable)
      .values({
        content: 'Full entry content',
        title: 'Full entry title',
        is_pinned: true,
        is_favorite: true,
        tags: ['important', 'work', 'priority'],
        usage_count: 15
      })
      .returning()
      .execute();

    const testInput: TrackUsageInput = {
      id: createdEntry.id
    };

    const result = await trackUsage(testInput);

    // Verify all fields are preserved
    expect(result.content).toEqual('Full entry content');
    expect(result.title).toEqual('Full entry title');
    expect(result.is_pinned).toEqual(true);
    expect(result.is_favorite).toEqual(true);
    expect(result.tags).toEqual(['important', 'work', 'priority']);
    expect(result.usage_count).toEqual(16); // Incremented
    expect(result.last_used_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(createdEntry.created_at);
  });
});