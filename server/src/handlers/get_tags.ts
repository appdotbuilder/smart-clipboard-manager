import { db } from '../db';
import { clipboardEntriesTable } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function getAllTags(): Promise<string[]> {
  try {
    // Query to extract all unique tags from the JSON array column
    // Cast to jsonb and use jsonb_array_elements_text to unnest arrays
    const result = await db.execute(sql`
      SELECT DISTINCT jsonb_array_elements_text(tags::jsonb) as tag
      FROM ${clipboardEntriesTable}
      WHERE tags IS NOT NULL 
        AND jsonb_array_length(tags::jsonb) > 0
      ORDER BY tag ASC
    `);

    return result.rows.map((row: any) => row.tag);
  } catch (error) {
    console.error('Failed to retrieve all tags:', error);
    throw error;
  }
}

export async function getPopularTags(limit: number = 10): Promise<Array<{tag: string, count: number}>> {
  try {
    // Query to get tags with their usage counts, sorted by frequency
    // Cast to jsonb and unnest the arrays, count occurrences, and order by count descending
    const result = await db.execute(sql`
      SELECT jsonb_array_elements_text(tags::jsonb) as tag, 
             COUNT(*) as count
      FROM ${clipboardEntriesTable}
      WHERE tags IS NOT NULL 
        AND jsonb_array_length(tags::jsonb) > 0
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT ${limit}
    `);

    return result.rows.map((row: any) => ({
      tag: row.tag,
      count: parseInt(row.count, 10)
    }));
  } catch (error) {
    console.error('Failed to retrieve popular tags:', error);
    throw error;
  }
}