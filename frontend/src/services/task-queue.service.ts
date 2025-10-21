/**
 * Async Task Queue System
 * Manages OCR and other async tasks with priority, cancellation, and timeout support
 */

import type { AsyncTask } from '@shared/types';

export interface TaskQueueOptions {
  maxConcurrent?: number;
  defaultTimeout?: number;
  defaultPriority?: number;
}

export interface TaskOptions {
  priority?: number;
  timeout?: number;
  signal?: AbortSignal;
}

type TaskExecutor<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Priority-based async task queue with cancellation support
 * Prevents UI blocking by limiting concurrent operations
 */
export class AsyncTaskQueue {
  private queue: AsyncTask[] = [];
  private running: Map<string, AsyncTask> = new Map();
  private maxConcurrent: number;
  private defaultTimeout: number;
  private defaultPriority: number;

  constructor(options: TaskQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds
    this.defaultPriority = options.defaultPriority || 5;
  }

  /**
   * Add a task to the queue
   * Returns a promise that resolves with the task result
   */
  async add<T>(
    type: string,
    executor: TaskExecutor<T>,
    options: TaskOptions = {}
  ): Promise<T> {
    const task: AsyncTask<T> = {
      id: this.generateId(),
      type,
      status: 'pending',
      priority: options.priority ?? this.defaultPriority,
      createdAt: Date.now(),
    };

    // Create abort controller with timeout
    const abortController = new AbortController();
    const timeout = options.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => {
      abortController.abort();
      this.handleTaskError(task, new Error('Task timeout'));
    }, timeout);

    // Handle external abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        abortController.abort();
        this.handleTaskCancellation(task);
      });
    }

    // Create promise for this task
    const taskPromise = new Promise<T>((resolve, reject) => {
      const wrappedExecutor = async () => {
        try {
          task.status = 'running';
          task.startedAt = Date.now();
          this.running.set(task.id, task);

          // Execute the task
          const result = await executor(abortController.signal);

          // Success
          clearTimeout(timeoutId);
          task.status = 'completed';
          task.completedAt = Date.now();
          task.result = result;
          this.running.delete(task.id);
          
          resolve(result);
          this.processQueue(); // Process next task
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Check if it was cancelled
          if (abortController.signal.aborted) {
            task.status = 'cancelled';
            task.error = 'Task was cancelled';
            reject(new Error('Task was cancelled'));
          } else {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
            reject(error);
          }
          
          task.completedAt = Date.now();
          this.running.delete(task.id);
          this.processQueue(); // Process next task
        }
      };

      // Store executor on task for queue processing
      (task as any).executor = wrappedExecutor;
    });

    // Add to queue
    this.queue.push(task);
    this.sortQueue();

    // Start processing if capacity available
    this.processQueue();

    return taskPromise;
  }

  /**
   * Cancel a specific task by ID
   */
  cancel(taskId: string): boolean {
    // Check if running
    const runningTask = this.running.get(taskId);
    if (runningTask) {
      runningTask.status = 'cancelled';
      this.running.delete(taskId);
      return true;
    }

    // Check if in queue
    const queueIndex = this.queue.findIndex((t) => t.id === taskId);
    if (queueIndex >= 0) {
      const task = this.queue[queueIndex];
      task.status = 'cancelled';
      this.queue.splice(queueIndex, 1);
      return true;
    }

    return false;
  }

  /**
   * Cancel all tasks of a specific type
   */
  cancelByType(type: string): number {
    let cancelled = 0;

    // Cancel running tasks
    for (const [id, task] of this.running) {
      if (task.type === type) {
        task.status = 'cancelled';
        this.running.delete(id);
        cancelled++;
      }
    }

    // Cancel queued tasks
    this.queue = this.queue.filter((task) => {
      if (task.type === type) {
        task.status = 'cancelled';
        cancelled++;
        return false;
      }
      return true;
    });

    return cancelled;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      running: this.running.size,
      capacity: this.maxConcurrent,
      availableSlots: Math.max(0, this.maxConcurrent - this.running.size),
    };
  }

  /**
   * Get all tasks (for debugging/monitoring)
   */
  getTasks(): { queue: AsyncTask[]; running: AsyncTask[] } {
    return {
      queue: [...this.queue],
      running: Array.from(this.running.values()),
    };
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.queue.forEach((task) => {
      task.status = 'cancelled';
    });
    this.queue = [];
  }

  /**
   * Process the queue - start tasks if capacity available
   */
  private processQueue(): void {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task && (task as any).executor) {
        (task as any).executor();
      }
    }
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Earlier created first (FIFO within same priority)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Handle task error
   */
  private handleTaskError(task: AsyncTask, error: Error): void {
    task.status = 'failed';
    task.error = error.message;
    task.completedAt = Date.now();
  }

  /**
   * Handle task cancellation
   */
  private handleTaskCancellation(task: AsyncTask): void {
    task.status = 'cancelled';
    task.completedAt = Date.now();
  }

  /**
   * Generate unique task ID
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance for OCR tasks
export const ocrTaskQueue = new AsyncTaskQueue({
  maxConcurrent: 2, // Limit to 2 concurrent OCR operations
  defaultTimeout: 60000, // 60 seconds for OCR
  defaultPriority: 5,
});

// Export singleton for general tasks
export const generalTaskQueue = new AsyncTaskQueue({
  maxConcurrent: 4,
  defaultTimeout: 30000,
  defaultPriority: 5,
});
