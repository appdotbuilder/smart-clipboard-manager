import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { type ClipboardStats } from '../schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function getClipboardStats(): Promise<ClipboardStats> {
  try {
    // Get basic counts using aggregation
    const countResults = await db.select({
      total_entries: sql<number>`count(*)`,
      pinned_entries: sql<number>`count(*) filter (where ${clipboardEntriesTable.is_pinned} = true)`,
      favorite_entries: sql<number>`count(*) filter (where ${clipboardEntriesTable.is_favorite} = true)`
    })
    .from(clipboardEntriesTable)
    .execute();

    const counts = countResults[0];

    // Get unique tags count by unnesting the JSON array
    const tagCountResults = await db.execute(sql`
      SELECT COUNT(DISTINCT tag) as total_tags
      FROM ${clipboardEntriesTable},
      json_array_elements_text(tags) as tag
      WHERE json_array_length(tags) > 0
    `);

    const totalTags = tagCountResults.rows[0]?.['total_tags'] || 0;

    // Get most used entry (highest usage_count)
    const mostUsedResults = await db.select()
      .from(clipboardEntriesTable)
      .where(sql`${clipboardEntriesTable.usage_count} > 0`)
      .orderBy(desc(clipboardEntriesTable.usage_count))
      .limit(1)
      .execute();

    const mostUsedEntry = mostUsedResults.length > 0 ? mostUsedResults[0] : null;

    // Get 5 most recent entries
    const recentResults = await db.select()
      .from(clipboardEntriesTable)
      .orderBy(desc(clipboardEntriesTable.created_at))
      .limit(5)
      .execute();

    return {
      total_entries: Number(counts.total_entries),
      pinned_entries: Number(counts.pinned_entries),
      favorite_entries: Number(counts.favorite_entries),
      total_tags: Number(totalTags),
      most_used_entry: mostUsedEntry,
      recent_entries: recentResults
    };
  } catch (error) {
    console.error('Get clipboard stats failed:', error);
    throw error;
  }
}