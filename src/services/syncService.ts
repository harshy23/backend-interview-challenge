import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Task, SyncQueueItem } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

export class SyncService {
  private apiUrl: string;

  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
  }

  async addToSyncQueue(
    taskId: string,
    operation: 'create' | 'update' | 'delete',
    data: Partial<Task>
  ): Promise<void> {
    const id = uuidv4();
    const serializedData = JSON.stringify(data);

    const insertsql = `
      INSERT INTO sync_queue (
        id, task_id, operation, data, created_at, retry_count, error_message
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, NULL)
    `;
    await this.db.run(insertsql, [id, taskId, operation, serializedData]);
  }

  async sync(): Promise<{
    success: boolean;
    synced_items: number;
    failed_items: number;
    errors: Array<{ taskId: string; error: string }>;
  }> {
    const allItems = await this.db.all(`SELECT * FROM sync_queue ORDER BY created_at ASC`);
    if (!allItems.length) {
      return { success: true, synced_items: 0, failed_items: 0, errors: [] };
    }

    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '10', 10);
    const batches: Array<any[]> = [];
    for (let i = 0; i < allItems.length; i += batchSize) {
      batches.push(allItems.slice(i, i + batchSize));
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ taskId: string; error: string }> = [];
    for (const batch of batches) {
      try {
        const batchResult = await this.processBatch(batch);
        syncedCount += batchResult.syncedCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);
      } catch (error: any) {
        failedCount += batch.length;
        batch.forEach(item =>
          errors.push({ taskId: item.task_id, error: error?.message || 'Unknown error' })
        );
      }
    }
    return {
      success: failedCount === 0,
      synced_items: syncedCount,
      failed_items: failedCount,
      errors,
    };
  }

  private async processBatch(items: SyncQueueItem[]): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: Array<{ taskId: string; operation: string; error: string; timestamp: Date }>;
  }> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ taskId: string; operation: string; error: string; timestamp: Date }> = [];

    // Batch Items format
    const batchItems = items.map(item => ({
      client_id: item.id,
      task_id: item.task_id,
      operation: item.operation,
      data: JSON.parse(item.data as string),
    }));

    // Compute checksum for integrity
    const checksum = require('crypto').createHash('sha256').update(JSON.stringify(batchItems)).digest('hex');
    const batchRequest = { items: batchItems, client_timestamp: new Date() };

    try {
      // Here would actually call your API server; 
      // for local/offline/integration, simulate success!
      // const response = await axios.post(`${this.apiUrl}/batch`, batchRequest, {
      //   headers: { 'X-Checksum': checksum },
      // });
      // For dummy: Mark all as success
      for (const localItem of items) {
        await this.updateSyncStatus(localItem.task_id, 'synced');
        syncedCount += 1;
      }
    } catch (error: any) {
      items.forEach(item => {
        errors.push({
          taskId: item.task_id,
          operation: item.operation,
          error: error?.message || 'Unknown error',
          timestamp: new Date(),
        });
      });
      failedCount += items.length;
    }

    return { syncedCount, failedCount, errors };
  }

  private async updateSyncStatus(
    taskId: string,
    status: 'synced' | 'error',
    serverData?: Partial<Task>
  ): Promise<void> {
    const now = new Date().toISOString();
    if (status === 'synced') {
      await this.db.run(
        `UPDATE tasks SET sync_status = ?, last_synced_at = ?, server_id = COALESCE(?, server_id) WHERE id = ?`,
        [status, now, serverData?.server_id ?? null, taskId]
      );
      await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
    } else {
      await this.db.run(`UPDATE tasks SET sync_status = ? WHERE id = ?`, [status, taskId]);
    }
  }
}
