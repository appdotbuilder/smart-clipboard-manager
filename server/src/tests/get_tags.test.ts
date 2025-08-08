import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { getAllTags, getPopularTags } from '../handlers/get_tags';

describe('getTags handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getAllTags', () => {
    it('should return empty array when no entries exist', async () => {
      const result = await getAllTags();
      expect(result).toEqual([]);
    });

    it('should return empty array when no entries have tags', async () => {
      // Create entries without tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: [] },
          { content: 'Entry 2', tags: [] }
        ])
        .execute();

      const result = await getAllTags();
      expect(result).toEqual([]);
    });

    it('should return unique tags sorted alphabetically', async () => {
      // Create entries with various tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['work', 'important'] },
          { content: 'Entry 2', tags: ['personal', 'work'] },
          { content: 'Entry 3', tags: ['work', 'archive'] },
          { content: 'Entry 4', tags: ['personal'] }
        ])
        .execute();

      const result = await getAllTags();
      
      expect(result).toHaveLength(4);
      expect(result).toEqual(['archive', 'important', 'personal', 'work']);
    });

    it('should handle duplicate tags across entries', async () => {
      // Create multiple entries with overlapping tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['javascript', 'code'] },
          { content: 'Entry 2', tags: ['javascript', 'tutorial'] },
          { content: 'Entry 3', tags: ['python', 'code'] },
          { content: 'Entry 4', tags: ['javascript'] }
        ])
        .execute();

      const result = await getAllTags();
      
      expect(result).toHaveLength(4);
      expect(result).toEqual(['code', 'javascript', 'python', 'tutorial']);
    });

    it('should handle entries with null tags', async () => {
      // Create mix of entries with and without tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['test'] },
          { content: 'Entry 2' }, // No tags field (will be null)
          { content: 'Entry 3', tags: ['example'] }
        ])
        .execute();

      const result = await getAllTags();
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(['example', 'test']);
    });
  });

  describe('getPopularTags', () => {
    it('should return empty array when no entries exist', async () => {
      const result = await getPopularTags();
      expect(result).toEqual([]);
    });

    it('should return empty array when no entries have tags', async () => {
      // Create entries without tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: [] },
          { content: 'Entry 2', tags: [] }
        ])
        .execute();

      const result = await getPopularTags();
      expect(result).toEqual([]);
    });

    it('should return tags with counts sorted by popularity', async () => {
      // Create entries with tags of varying popularity
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['javascript', 'code'] }, // js=1, code=1
          { content: 'Entry 2', tags: ['javascript', 'tutorial'] }, // js=2, tutorial=1
          { content: 'Entry 3', tags: ['javascript', 'code'] }, // js=3, code=2
          { content: 'Entry 4', tags: ['python'] }, // python=1
          { content: 'Entry 5', tags: ['code'] } // code=3
        ])
        .execute();

      const result = await getPopularTags();
      
      expect(result).toHaveLength(4);
      // Should be sorted by count DESC, then tag name ASC
      expect(result[0]).toEqual({ tag: 'code', count: 3 });
      expect(result[1]).toEqual({ tag: 'javascript', count: 3 });
      expect(result[2]).toEqual({ tag: 'python', count: 1 });
      expect(result[3]).toEqual({ tag: 'tutorial', count: 1 });
    });

    it('should respect limit parameter', async () => {
      // Create entries with many different tags
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['tag1', 'tag2', 'tag3'] },
          { content: 'Entry 2', tags: ['tag2', 'tag4', 'tag5'] },
          { content: 'Entry 3', tags: ['tag3', 'tag6'] }
        ])
        .execute();

      const result = await getPopularTags(3);
      
      expect(result).toHaveLength(3);
      // Should return only top 3 tags
      expect(result.every(item => typeof item.tag === 'string')).toBe(true);
      expect(result.every(item => typeof item.count === 'number')).toBe(true);
    });

    it('should use default limit of 10', async () => {
      // Create entries with exactly 12 different tags
      const tags = Array.from({ length: 12 }, (_, i) => `tag${i + 1}`);
      
      for (let i = 0; i < tags.length; i++) {
        await db.insert(clipboardEntriesTable)
          .values({ content: `Entry ${i}`, tags: [tags[i]] })
          .execute();
      }

      const result = await getPopularTags(); // No limit specified
      
      expect(result).toHaveLength(10); // Should default to 10
    });

    it('should handle tags with same count correctly', async () => {
      // Create entries where multiple tags have same count
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['alpha'] },
          { content: 'Entry 2', tags: ['beta'] },
          { content: 'Entry 3', tags: ['gamma'] }
        ])
        .execute();

      const result = await getPopularTags();
      
      expect(result).toHaveLength(3);
      // All should have count of 1, sorted alphabetically
      expect(result).toEqual([
        { tag: 'alpha', count: 1 },
        { tag: 'beta', count: 1 },
        { tag: 'gamma', count: 1 }
      ]);
    });

    it('should handle limit larger than available tags', async () => {
      await db.insert(clipboardEntriesTable)
        .values([
          { content: 'Entry 1', tags: ['only', 'two'] }
        ])
        .execute();

      const result = await getPopularTags(100);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { tag: 'only', count: 1 },
        { tag: 'two', count: 1 }
      ]);
    });
  });
});