import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { getClipboardStats } from '../handlers/get_clipboard_stats';

describe('getClipboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no entries exist', async () => {
    const stats = await getClipboardStats();

    expect(stats.total_entries).toEqual(0);
    expect(stats.pinned_entries).toEqual(0);
    expect(stats.favorite_entries).toEqual(0);
    expect(stats.total_tags).toEqual(0);
    expect(stats.most_used_entry).toBeNull();
    expect(stats.recent_entries).toHaveLength(0);
  });

  it('should count basic entries correctly', async () => {
    // Create test entries
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Entry 1',
        title: 'Test Entry 1',
        is_pinned: true,
        is_favorite: false,
        tags: ['work', 'important'],
        usage_count: 5
      },
      {
        content: 'Entry 2',
        title: 'Test Entry 2',
        is_pinned: false,
        is_favorite: true,
        tags: ['personal'],
        usage_count: 2
      },
      {
        content: 'Entry 3',
        title: null,
        is_pinned: true,
        is_favorite: true,
        tags: [],
        usage_count: 0
      }
    ]).execute();

    const stats = await getClipboardStats();

    expect(stats.total_entries).toEqual(3);
    expect(stats.pinned_entries).toEqual(2);
    expect(stats.favorite_entries).toEqual(2);
  });

  it('should count unique tags correctly', async () => {
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Entry 1',
        tags: ['work', 'important', 'urgent'],
        usage_count: 0
      },
      {
        content: 'Entry 2',
        tags: ['work', 'personal'], // 'work' is duplicate
        usage_count: 0
      },
      {
        content: 'Entry 3',
        tags: ['hobby', 'personal'], // 'personal' is duplicate
        usage_count: 0
      },
      {
        content: 'Entry 4',
        tags: [], // No tags
        usage_count: 0
      }
    ]).execute();

    const stats = await getClipboardStats();

    // Should count: work, important, urgent, personal, hobby = 5 unique tags
    expect(stats.total_tags).toEqual(5);
  });

  it('should identify most used entry correctly', async () => {
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Low usage entry',
        title: 'Entry 1',
        usage_count: 2,
        tags: []
      },
      {
        content: 'High usage entry',
        title: 'Most Used',
        usage_count: 10,
        tags: ['popular']
      },
      {
        content: 'No usage entry',
        title: 'Entry 3',
        usage_count: 0,
        tags: []
      },
      {
        content: 'Medium usage entry',
        title: 'Entry 4',
        usage_count: 5,
        tags: []
      }
    ]).execute();

    const stats = await getClipboardStats();

    expect(stats.most_used_entry).not.toBeNull();
    expect(stats.most_used_entry?.content).toEqual('High usage entry');
    expect(stats.most_used_entry?.title).toEqual('Most Used');
    expect(stats.most_used_entry?.usage_count).toEqual(10);
  });

  it('should return null for most used entry when no entries have usage', async () => {
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Entry 1',
        usage_count: 0,
        tags: []
      },
      {
        content: 'Entry 2',
        usage_count: 0,
        tags: []
      }
    ]).execute();

    const stats = await getClipboardStats();

    expect(stats.most_used_entry).toBeNull();
  });

  it('should return recent entries in correct order', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Insert entries with different creation times
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Old entry',
        title: 'Oldest',
        created_at: twoDaysAgo,
        usage_count: 0,
        tags: []
      },
      {
        content: 'Recent entry',
        title: 'Most Recent',
        created_at: now,
        usage_count: 0,
        tags: []
      },
      {
        content: 'Medium entry',
        title: 'Middle',
        created_at: oneHourAgo,
        usage_count: 0,
        tags: []
      }
    ]).execute();

    const stats = await getClipboardStats();

    expect(stats.recent_entries).toHaveLength(3);
    // Should be ordered by created_at DESC (most recent first)
    expect(stats.recent_entries[0].title).toEqual('Most Recent');
    expect(stats.recent_entries[1].title).toEqual('Middle');
    expect(stats.recent_entries[2].title).toEqual('Oldest');
  });

  it('should limit recent entries to 5 items', async () => {
    // Create 7 entries
    const entries = Array.from({ length: 7 }, (_, i) => ({
      content: `Entry ${i + 1}`,
      title: `Entry ${i + 1}`,
      usage_count: 0,
      tags: []
    }));

    await db.insert(clipboardEntriesTable).values(entries).execute();

    const stats = await getClipboardStats();

    expect(stats.recent_entries).toHaveLength(5);
    expect(stats.total_entries).toEqual(7);
  });

  it('should handle entries with complex tag combinations', async () => {
    await db.insert(clipboardEntriesTable).values([
      {
        content: 'Entry with many tags',
        title: 'Tagged Entry',
        is_pinned: true,
        is_favorite: true,
        tags: ['work', 'project-a', 'urgent', 'meeting'],
        usage_count: 8
      },
      {
        content: 'Entry with duplicate tags scenario',
        tags: ['work', 'project-a', 'notes'], // Some overlap with above
        usage_count: 3
      },
      {
        content: 'Entry with single tag',
        tags: ['personal'],
        usage_count: 1
      }
    ]).execute();

    const stats = await getClipboardStats();

    expect(stats.total_entries).toEqual(3);
    expect(stats.pinned_entries).toEqual(1);
    expect(stats.favorite_entries).toEqual(1);
    // Unique tags: work, project-a, urgent, meeting, notes, personal = 6
    expect(stats.total_tags).toEqual(6);
    expect(stats.most_used_entry?.usage_count).toEqual(8);
  });
});