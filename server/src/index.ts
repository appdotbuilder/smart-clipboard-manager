import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createClipboardEntryInputSchema,
  updateClipboardEntryInputSchema,
  searchClipboardInputSchema,
  trackUsageInputSchema,
  bulkDeleteInputSchema
} from './schema';

// Import handlers
import { createClipboardEntry } from './handlers/create_clipboard_entry';
import { getClipboardEntries, getAllClipboardEntries } from './handlers/get_clipboard_entries';
import { updateClipboardEntry } from './handlers/update_clipboard_entry';
import { deleteClipboardEntry, bulkDeleteClipboardEntries, clearAllClipboardEntries } from './handlers/delete_clipboard_entry';
import { trackUsage } from './handlers/track_usage';
import { getClipboardStats } from './handlers/get_clipboard_stats';
import { getAllTags, getPopularTags } from './handlers/get_tags';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Clipboard entry management
  createClipboardEntry: publicProcedure
    .input(createClipboardEntryInputSchema)
    .mutation(({ input }) => createClipboardEntry(input)),

  getAllClipboardEntries: publicProcedure
    .query(() => getAllClipboardEntries()),

  searchClipboardEntries: publicProcedure
    .input(searchClipboardInputSchema)
    .query(({ input }) => getClipboardEntries(input)),

  updateClipboardEntry: publicProcedure
    .input(updateClipboardEntryInputSchema)
    .mutation(({ input }) => updateClipboardEntry(input)),

  deleteClipboardEntry: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteClipboardEntry(input.id)),

  bulkDeleteClipboardEntries: publicProcedure
    .input(bulkDeleteInputSchema)
    .mutation(({ input }) => bulkDeleteClipboardEntries(input)),

  clearAllClipboardEntries: publicProcedure
    .mutation(() => clearAllClipboardEntries()),

  // Usage tracking
  trackUsage: publicProcedure
    .input(trackUsageInputSchema)
    .mutation(({ input }) => trackUsage(input)),

  // Statistics and analytics
  getClipboardStats: publicProcedure
    .query(() => getClipboardStats()),

  // Tag management
  getAllTags: publicProcedure
    .query(() => getAllTags()),

  getPopularTags: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(50).default(10) }))
    .query(({ input }) => getPopularTags(input.limit)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Smart Clipboard History Manager TRPC server listening at port: ${port}`);
}

start();