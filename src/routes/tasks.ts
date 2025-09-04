import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { SyncService } from '../services/syncService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const syncService = new SyncService(db, undefined as any);
  const taskService = new TaskService(db, syncService);

  // Get all tasks
   router.get('/', async (req, res) => {
    try {
      const tasks = await taskService.getAllTasks();
      return res.json(tasks);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task by id
  router.get('/:id', async (req, res) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create new task
  router.post('/', async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      const newTask = await taskService.createTask({ title, description });
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update existing task
  router.put('/:id', async (req, res) => {
    try {
      const updates = req.body;
      const updatedTask = await taskService.updateTask(req.params.id, updates);
      if (!updatedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Soft delete task
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await taskService.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
}
