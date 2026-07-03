import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { Task, TaskFilters, PaginationMeta } from '@/types/task';
import { fetchTasks, fetchTaskById } from './taskThunks';

// ─── Entity Adapter ───────────────────────────────────────────────────────────

export const tasksAdapter = createEntityAdapter<Task>({
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
});

// ─── Slice State ──────────────────────────────────────────────────────────────

export interface TasksState extends ReturnType<typeof tasksAdapter.getInitialState> {
  filters: TaskFilters;
  pagination: PaginationMeta;
  loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  selectedTaskId: string | null;
  isStale: boolean; // stale when showing cached data
  wsConnected: boolean;
}

const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  status: 'all',
  type: 'all',
  sortField: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
};

const initialState: TasksState = {
  ...tasksAdapter.getInitialState(),
  filters: DEFAULT_FILTERS,
  pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
  loadingStatus: 'idle',
  error: null,
  selectedTaskId: null,
  isStale: false,
  wsConnected: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilter<K extends keyof TaskFilters>(
      state: TasksState,
      action: PayloadAction<{ key: K; value: TaskFilters[K] }>
    ) {
      state.filters[action.payload.key] = action.payload.value;
      // Reset to page 1 on filter change
      if (action.payload.key !== 'page') {
        state.filters.page = 1;
      }
    },
    setSelectedTaskId(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
    resetFilters(state) {
      state.filters = DEFAULT_FILTERS;
    },
    setStale(state, action: PayloadAction<boolean>) {
      state.isStale = action.payload;
    },
    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
    },
    // WebSocket task.updated: partial upsert (only id + changed fields come from WS)
    upsertTask(state, action: PayloadAction<Partial<Task> & { id: string }>) {
      const existing = state.entities[action.payload.id];
      if (existing) {
        // Merge: keep existing fields, overlay WS changes
        tasksAdapter.updateOne(state, {
          id: action.payload.id,
          changes: action.payload,
        });
      }
      // If task not loaded yet (beyond current page), ignore gracefully
      // Don't create a skeleton entry — fetch-on-select will load it properly
    },
    // WebSocket task.assigned: update only assignee field
    updateTaskAssignee(
      state,
      action: PayloadAction<{ taskId: string; assignee: string | null }>
    ) {
      const { taskId, assignee } = action.payload;
      const existing = state.entities[taskId];
      if (existing) {
        tasksAdapter.updateOne(state, { id: taskId, changes: { assignee } });
      }
      // Graceful: unknown task IDs (beyond loaded page) are silently ignored
    },
    // WebSocket annotation.created: count=-1 means "increment" (we don't get exact count)
    updateAnnotationCount(
      state,
      action: PayloadAction<{ taskId: string; count: number }>
    ) {
      const { taskId, count } = action.payload;
      const existing = state.entities[taskId];
      if (existing) {
        const newCount = count === -1
          ? existing.annotationCount + 1  // -1 = increment signal from WS hook
          : count;                          // exact count (from fetchTaskById)
        tasksAdapter.updateOne(state, {
          id: taskId,
          changes: { annotationCount: newCount },
        });
      }
      // Graceful: unknown task IDs silently ignored
    },
    // Load cached tasks (from IndexedDB)
    loadCachedTasks(
      state,
      action: PayloadAction<{ tasks: Task[]; meta: PaginationMeta }>
    ) {
      tasksAdapter.setAll(state, action.payload.tasks);
      state.pagination = action.payload.meta;
      state.isStale = true;
      state.loadingStatus = 'succeeded';
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTasks
      .addCase(fetchTasks.pending, (state) => {
        state.loadingStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loadingStatus = 'succeeded';
        state.error = null;
        state.isStale = false;
        tasksAdapter.setAll(state, action.payload.tasks);
        state.pagination = action.payload.meta;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loadingStatus = 'failed';
        state.error = action.payload ?? 'Failed to fetch tasks';
      })
      // fetchTaskById
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        tasksAdapter.upsertOne(state, action.payload);
      });
  },
});

export const {
  setFilter,
  setSelectedTaskId,
  resetFilters,
  setStale,
  setWsConnected,
  upsertTask,
  updateTaskAssignee,
  updateAnnotationCount,
  loadCachedTasks,
} = taskSlice.actions;

export default taskSlice.reducer;
