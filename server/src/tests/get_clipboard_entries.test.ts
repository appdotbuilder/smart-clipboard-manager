import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type SearchClipboardInput } from '../schema';
import { getClipboardEntries, getAllClipboardEntries } from '../handlers/get_clipboard_entries';

// Test data setup
const testEntries = [
  {
    content: 'First clipboard entry',
    title: 'First Entry',
    is_pinned: true,
    is_favorite: false,
    tags: ['work', 'important'],
    usage_count: 5,
    last_used_at: new Date('2023-01-01')
  },
  {
    content: 'Second clipboard entry with JavaScript code',
    title: 'Code Snippet',
    is_pinned: false,
    is_favorite: true,
    tags: ['code', 'javascript'],
    usage_count: 2,
    last_used_at: new Date('2023-01-02')
  },
  {
    content: 'Third entry without title',
    title: null,
    is_pinned: false,
    is_favorite: false,
    tags: ['personal'],
    usage_count: 0,
    last_used_at: null
  },
  {
    content: 'Fourth pinned entry',
    title: 'Another Pinned',
    is_pinned: true,
    is_favorite: true,
    tags: ['work', 'urgent'],
    usage_count: 10,
    last_used_at: new Date('2023-01-03')
  }
];

describe('getClipboardEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Insert test data
    await db.insert(clipboardEntriesTable).values(testEntries).execute();
  });

  it('should return all entries when no input provided', async () => {
    const result = await getClipboardEntries();

    expect(result).toHaveLength(4);
    
    // Verify ordering: pinned items first, then by created_at DESC
    expect(result[0].is_pinned).toBe(true);
    expect(result[1].is_pinned).toBe(true);
    expect(result[2].is_pinned).toBe(false);
    expect(result[3].is_pinned).toBe(false);
  });

  it('should return empty array when no entries exist', async () => {
    // Clear all entries
    await db.delete(clipboardEntriesTable).execute();

    const result = await getClipboardEntries();

    expect(result).toHaveLength(0);
  });

  it('should filter by text query in content', async () => {
    const input: SearchClipboardInput = {
      query: 'JavaScript',
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('JavaScript');
    expect(result[0].title).toBe('Code Snippet');
  });

  it('should filter by text query in title', async () => {
    const input: SearchClipboardInput = {
      query: 'First Entry',
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('First Entry');
  });

  it('should filter by pinned status', async () => {
    const input: SearchClipboardInput = {
      is_pinned: true,
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
    result.forEach(entry => {
      expect(entry.is_pinned).toBe(true);
    });
  });

  it('should filter by favorite status', async () => {
    const input: SearchClipboardInput = {
      is_favorite: true,
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
    result.forEach(entry => {
      expect(entry.is_favorite).toBe(true);
    });
  });

  it('should filter by single tag', async () => {
    const input: SearchClipboardInput = {
      tags: ['work'],
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
    result.forEach(entry => {
      expect(entry.tags).toContain('work');
    });
  });

  it('should filter by multiple tags (OR logic)', async () => {
    const input: SearchClipboardInput = {
      tags: ['code', 'personal'],
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
    // Should find entries with either 'code' OR 'personal' tags
    expect(result.some(entry => entry.tags.includes('code'))).toBe(true);
    expect(result.some(entry => entry.tags.includes('personal'))).toBe(true);
  });

  it('should combine multiple filters', async () => {
    const input: SearchClipboardInput = {
      is_pinned: true,
      is_favorite: true,
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].is_pinned).toBe(true);
    expect(result[0].is_favorite).toBe(true);
    expect(result[0].title).toBe('Another Pinned');
  });

  it('should apply pagination with limit', async () => {
    const input: SearchClipboardInput = {
      limit: 2,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
  });

  it('should apply pagination with offset', async () => {
    const input: SearchClipboardInput = {
      limit: 2,
      offset: 2
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(2);
    
    // Get all entries to compare
    const allEntries = await getClipboardEntries();
    
    // Offset entries should be different from first 2
    expect(result[0].id).not.toBe(allEntries[0].id);
    expect(result[0].id).not.toBe(allEntries[1].id);
  });

  it('should handle case-insensitive text search', async () => {
    const input: SearchClipboardInput = {
      query: 'JAVASCRIPT',
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].content.toLowerCase()).toContain('javascript');
  });

  it('should return empty array when no matches found', async () => {
    const input: SearchClipboardInput = {
      query: 'nonexistent content',
      limit: 50,
      offset: 0
    };

    const result = await getClipboardEntries(input);

    expect(result).toHaveLength(0);
  });

  it('should maintain proper field types', async () => {
    const result = await getClipboardEntries();

    expect(result.length).toBeGreaterThan(0);
    
    const entry = result[0];
    expect(typeof entry.id).toBe('number');
    expect(typeof entry.content).toBe('string');
    expect(typeof entry.is_pinned).toBe('boolean');
    expect(typeof entry.is_favorite).toBe('boolean');
    expect(Array.isArray(entry.tags)).toBe(true);
    expect(entry.created_at).toBeInstanceOf(Date);
    expect(entry.updated_at).toBeInstanceOf(Date);
    expect(typeof entry.usage_count).toBe('number');
  });
});

describe('getAllClipboardEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Insert test data
    await db.insert(clipboardEntriesTable).values(testEntries).execute();
  });

  it('should return all entries ordered correctly', async () => {
    const result = await getAllClipboardEntries();

    expect(result).toHaveLength(4);
    
    // Verify ordering: pinned items first, then by created_at DESC
    expect(result[0].is_pinned).toBe(true);
    expect(result[1].is_pinned).toBe(true);
    expect(result[2].is_pinned).toBe(false);
    expect(result[3].is_pinned).toBe(false);
    
    // Among pinned items, should be ordered by created_at DESC
    const pinnedEntries = result.filter(entry => entry.is_pinned);
    expect(pinnedEntries[0].created_at >= pinnedEntries[1].created_at).toBe(true);
  });

  it('should return empty array when no entries exist', async () => {
    // Clear all entries
    await db.delete(clipboardEntriesTable).execute();

    const result = await getAllClipboardEntries();

    expect(result).toHaveLength(0);
  });

  it('should include all fields in results', async () => {
    const result = await getAllClipboardEntries();

    expect(result.length).toBeGreaterThan(0);
    
    const entry = result[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('content');
    expect(entry).toHaveProperty('title');
    expect(entry).toHaveProperty('is_pinned');
    expect(entry).toHaveProperty('is_favorite');
    expect(entry).toHaveProperty('tags');
    expect(entry).toHaveProperty('created_at');
    expect(entry).toHaveProperty('updated_at');
    expect(entry).toHaveProperty('usage_count');
    expect(entry).toHaveProperty('last_used_at');
  });

  it('should handle nullable fields correctly', async () => {
    const result = await getAllClipboardEntries();

    // Find entry with null title
    const entryWithNullTitle = result.find(entry => entry.title === null);
    expect(entryWithNullTitle).toBeDefined();
    expect(entryWithNullTitle!.title).toBeNull();

    // Find entry with null last_used_at
    const entryWithNullLastUsed = result.find(entry => entry.last_used_at === null);
    expect(entryWithNullLastUsed).toBeDefined();
    expect(entryWithNullLastUsed!.last_used_at).toBeNull();
  });
});