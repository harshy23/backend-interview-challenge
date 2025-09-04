import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db, undefined as any); // Not needed in sync-only contexts
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
   router.post('/sync', async (req: Request, res: Response) => {
    try {
      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        return res.status(503).json({ error: 'Server unreachable. Please try later.' });
      }
      const result = await syncService.sync();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Sync failed', details: (error as Error).message });
    }
  });

  // Sync status endpoint
  router.get('/status', async (req: Request, res: Response) => {
    try {
      // Get count of pending and error items in sync queue
      const pendingCountRow = await db.get(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'error')`
      );
      const pendingCount = pendingCountRow?.count ?? 0;

      // Get last sync timestamp (max last_synced_at)
      const lastSyncRow = await db.get(`SELECT MAX(last_synced_at) as lastSync FROM tasks`);
      const lastSync = lastSyncRow?.lastSync ?? null;

      // Check server connectivity
      const isOnline = await syncService.checkConnectivity();

      res.json({
        pendingCount,
        lastSync,
        online: isOnline,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sync status', details: (error as Error).message });
    }
  });

  // Batch sync endpoint (server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // NOTE: This should be implemented in your actual server code.
    // Here we return 501 since this is client-side router.
    res.status(501).json({ error: 'Not implemented on client.' });
  });

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}
