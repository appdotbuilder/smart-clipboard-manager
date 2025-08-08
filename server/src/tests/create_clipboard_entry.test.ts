import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type CreateClipboardEntryInput } from '../schema';
import { createClipboardEntry } from '../handlers/create_clipboard_entry';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateClipboardEntryInput = {
  content: 'Test clipboard content',
  title: 'Test Entry Title',
  tags: ['work', 'important']
};

// Test input with minimal required fields
const minimalInput: CreateClipboardEntryInput = {
  content: 'Minimal test content',
  tags: [] // Include tags field with empty array
};

describe('createClipboardEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a clipboard entry with all fields', async () => {
    const result = await createClipboardEntry(testInput);

    // Basic field validation
    expect(result.content).toEqual('Test clipboard content');
    expect(result.title).toEqual('Test Entry Title');
    expect(result.tags).toEqual(['work', 'important']);
    expect(result.is_pinned).toEqual(false);
    expect(result.is_favorite).toEqual(false);
    expect(result.usage_count).toEqual(0);
    expect(result.last_used_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a clipboard entry with minimal fields', async () => {
    const result = await createClipboardEntry(minimalInput);

    // Basic field validation
    expect(result.content).toEqual('Minimal test content');
    expect(result.title).toBeNull();
    expect(result.tags).toEqual([]);
    expect(result.is_pinned).toEqual(false);
    expect(result.is_favorite).toEqual(false);
    expect(result.usage_count).toEqual(0);
    expect(result.last_used_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save clipboard entry to database', async () => {
    const result = await createClipboardEntry(testInput);

    // Query using proper drizzle syntax
    const entries = await db.select()
      .from(clipboardEntriesTable)
      .where(eq(clipboardEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].content).toEqual('Test clipboard content');
    expect(entries[0].title).toEqual('Test Entry Title');
    expect(entries[0].tags).toEqual(['work', 'important']);
    expect(entries[0].is_pinned).toEqual(false);
    expect(entries[0].is_favorite).toEqual(false);
    expect(entries[0].usage_count).toEqual(0);
    expect(entries[0].last_used_at).toBeNull();
    expect(entries[0].created_at).toBeInstanceOf(Date);
    expect(entries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty tags array correctly', async () => {
    const inputWithEmptyTags: CreateClipboardEntryInput = {
      content: 'Content with empty tags',
      title: 'Test Title',
      tags: []
    };

    const result = await createClipboardEntry(inputWithEmptyTags);

    expect(result.tags).toEqual([]);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should handle null title correctly', async () => {
    const inputWithNullTitle: CreateClipboardEntryInput = {
      content: 'Content with null title',
      title: null,
      tags: ['test']
    };

    const result = await createClipboardEntry(inputWithNullTitle);

    expect(result.title).toBeNull();
    expect(result.content).toEqual('Content with null title');
    expect(result.tags).toEqual(['test']);
  });

  it('should auto-generate timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createClipboardEntry(testInput);
    const afterCreate = new Date();

    // Timestamps should be within reasonable range
    expect(result.created_at >= beforeCreate).toBe(true);
    expect(result.created_at <= afterCreate).toBe(true);
    expect(result.updated_at >= beforeCreate).toBe(true);
    expect(result.updated_at <= afterCreate).toBe(true);
  });

  it('should create multiple entries with unique IDs', async () => {
    const entry1 = await createClipboardEntry({
      content: 'First entry',
      tags: ['first']
    });

    const entry2 = await createClipboardEntry({
      content: 'Second entry', 
      tags: ['second']
    });

    expect(entry1.id).not.toEqual(entry2.id);
    expect(entry1.content).toEqual('First entry');
    expect(entry2.content).toEqual('Second entry');
  });
});