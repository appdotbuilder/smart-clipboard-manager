import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type ClipboardEntry, type SearchClipboardInput } from '../schema';
import { eq, and, or, ilike, desc, asc, sql, SQL } from 'drizzle-orm';

export async function getClipboardEntries(input?: SearchClipboardInput): Promise<ClipboardEntry[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Apply filters if input is provided
    if (input) {
      // Text search in content and title
      if (input.query) {
        conditions.push(
          or(
            ilike(clipboardEntriesTable.content, `%${input.query}%`),
            ilike(clipboardEntriesTable.title, `%${input.query}%`)
          )!
        );
      }

      // Filter by pinned status
      if (input.is_pinned !== undefined) {
        conditions.push(eq(clipboardEntriesTable.is_pinned, input.is_pinned));
      }

      // Filter by favorite status
      if (input.is_favorite !== undefined) {
        conditions.push(eq(clipboardEntriesTable.is_favorite, input.is_favorite));
      }

      // Filter by tags (check if any of the provided tags exist in the entry's tags array)
      if (input.tags && input.tags.length > 0) {
        const tagConditions = input.tags.map(tag => 
          sql`${clipboardEntriesTable.tags}::jsonb ? ${tag}`
        );
        conditions.push(or(...tagConditions)!);
      }
    }

    // Build complete query in one chain to avoid type inference issues
    const baseQuery = db.select().from(clipboardEntriesTable);

    // Build the complete query conditionally
    let results;
    
    if (conditions.length > 0) {
      if (input) {
        results = await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(
            desc(clipboardEntriesTable.is_pinned),
            desc(clipboardEntriesTable.created_at)
          )
          .limit(input.limit)
          .offset(input.offset)
          .execute();
      } else {
        results = await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(
            desc(clipboardEntriesTable.is_pinned),
            desc(clipboardEntriesTable.created_at)
          )
          .execute();
      }
    } else {
      if (input) {
        results = await baseQuery
          .orderBy(
            desc(clipboardEntriesTable.is_pinned),
            desc(clipboardEntriesTable.created_at)
          )
          .limit(input.limit)
          .offset(input.offset)
          .execute();
      } else {
        results = await baseQuery
          .orderBy(
            desc(clipboardEntriesTable.is_pinned),
            desc(clipboardEntriesTable.created_at)
          )
          .execute();
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to get clipboard entries:', error);
    throw error;
  }
}

export async function getAllClipboardEntries(): Promise<ClipboardEntry[]> {
  try {
    const results = await db.select()
      .from(clipboardEntriesTable)
      .orderBy(
        desc(clipboardEntriesTable.is_pinned),
        desc(clipboardEntriesTable.created_at)
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get all clipboard entries:', error);
    throw error;
  }
}