import { createAsyncThunk } from '@reduxjs/toolkit';
import { taskApi } from '@/services/taskApi';
import { normalizeTask, normalizeTasks } from '@/utils/normalize';
import { Task, TaskFilters, PaginationMeta } from '@/types/task';
import { taskCache } from '@/lib/cache';

interface FetchTasksResult {
  tasks: Task[];
  meta: PaginationMeta;
}

export const fetchTasks = createAsyncThunk<
  FetchTasksResult,
  Partial<TaskFilters>,
  { rejectValue: string }
>('tasks/fetchTasks', async (filters, { rejectWithValue }) => {
  try {
    const response = await taskApi.getTasks(filters);

    // Real mock server returns `items` array (not `tasks`)
    const tasks = normalizeTasks(response.items);

    const meta: PaginationMeta = {
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
      totalPages: Math.ceil(response.total / response.pageSize),
    };

    // Cache in IndexedDB in background — don't await, never block UI
    taskCache.set('task-list', { tasks, meta }).catch(() => {
      // Ignore cache write errors silently
    });

    return { tasks, meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return rejectWithValue(message);
  }
});

export const fetchTaskById = createAsyncThunk<
  Task,
  string,
  { rejectValue: string }
>('tasks/fetchTaskById', async (id, { rejectWithValue }) => {
  try {
    const raw = await taskApi.getTaskById(id);
    return normalizeTask(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return rejectWithValue(message);
  }
});
