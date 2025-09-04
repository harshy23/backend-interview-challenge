import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';
import { SyncService } from './syncService';

export class TaskService {
  // syncService is optional to break circular dependency
  constructor(private db: Database, public syncService?: SyncService) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const newTask: Task = {
      id,
      title: taskData.title || "",
      description: taskData.description || "",
      completed: false,
      created_at: new Date(now),
      updated_at: new Date(now),
      is_deleted: false,
      sync_status: 'pending',
    };

    const insertsql = `INSERT INTO tasks (
      id, title, description, completed, created_at, updated_at, is_deleted, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    await this.db.run(insertsql, [
      newTask.id,
      newTask.title,
      newTask.description,
      newTask.completed ? 1 : 0,
      newTask.created_at.toISOString(),
      newTask.updated_at.toISOString(),
      newTask.is_deleted ? 1 : 0,
      newTask.sync_status,
    ]);

    // Only call if instance is available
    if (this.syncService) {
      await this.syncService.addToSyncQueue(newTask.id, 'create', newTask);
    }

    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existingtask = await this.getTask(id);
    if (!existingtask) {
      return null;
    }

    const updatedtask: Task = {
      ...existingtask,
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending',
    };

    const updatesql = `
      UPDATE tasks
      SET title = ?,
          description = ?,
          completed = ?,
          updated_at = ?,
          sync_status = ?
      WHERE id = ?`;

    await this.db.run(updatesql, [
      updatedtask.title,
      updatedtask.description || '',
      updatedtask.completed ? 1 : 0,
      updatedtask.updated_at.toISOString(),
      updatedtask.sync_status,
      id,
    ]);

    if (this.syncService) {
      await this.syncService.addToSyncQueue(id, 'update', updatedtask);
    }

    return updatedtask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const existingtask = await this.getTask(id);
    if (!existingtask) {
      return false;
    }

    const deletetask: Task = {
      ...existingtask,
      updated_at: new Date(),
      sync_status: 'pending',
      is_deleted: true,
    };

    const updatesql = `
      UPDATE tasks
      SET title = ?,
          description = ?,
          completed = ?,
          updated_at = ?,
          sync_status = ?,
          is_deleted = 1
      WHERE id = ?`;

    await this.db.run(updatesql, [
      deletetask.title,
      deletetask.description || '',
      deletetask.completed ? 1 : 0,
      deletetask.updated_at.toISOString(),
      deletetask.sync_status,
      id,
    ]);

    if (this.syncService) {
      await this.syncService.addToSyncQueue(id, 'delete', deletetask);
    }

    return true;
  }

  async getTask(id: string): Promise<Task | null> {
    const sql = `
      SELECT *
      FROM tasks
      WHERE id = ? AND is_deleted = 0
    `;

    const row = await this.db.get(sql, [id]);
    if (!row) {
      return null;
    }

    const task: Task = {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: row.is_deleted === 1,
      sync_status: row.sync_status,
      server_id: row.server_id,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    };

    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    const sql = `
      SELECT *
      FROM tasks
      WHERE is_deleted = 0
    `;

    const rows = await this.db.all(sql, []);

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: row.is_deleted === 1,
      sync_status: row.sync_status,
      server_id: row.server_id,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    }));
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    const sql = `
      SELECT *
      FROM tasks
      WHERE sync_status = "pending" OR sync_status = "error"
    `;
    const rows = await this.db.all(sql, []);
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: row.is_deleted === 1,
      sync_status: row.sync_status,
      server_id: row.server_id,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    }));
  }
}
