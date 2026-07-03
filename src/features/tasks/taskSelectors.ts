import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { tasksAdapter } from './taskSlice';
import { Task, TaskFilters, TaskStatus, TaskType } from '@/types/task';

// ─── Base Selectors ───────────────────────────────────────────────────────────

const selectTasksState = (state: RootState) => state.tasks;

export const {
  selectAll: selectAllTasks,
  selectById: selectTaskById,
  selectIds: selectTaskIds,
  selectEntities: selectTaskEntities,
  selectTotal: selectTotalTaskEntities,
} = tasksAdapter.getSelectors(selectTasksState);

export const selectFilters = (state: RootState) => state.tasks.filters;
export const selectPagination = (state: RootState) => state.tasks.pagination;
export const selectLoadingStatus = (state: RootState) => state.tasks.loadingStatus;
export const selectError = (state: RootState) => state.tasks.error;
export const selectSelectedTaskId = (state: RootState) => state.tasks.selectedTaskId;
export const selectIsStale = (state: RootState) => state.tasks.isStale;
export const selectWsConnected = (state: RootState) => state.tasks.wsConnected;

// ─── Derived Selectors ────────────────────────────────────────────────────────

export const selectSelectedTask = createSelector(
  selectTaskEntities,
  selectSelectedTaskId,
  (entities, id): Task | null => (id ? (entities[id] ?? null) : null)
);

export const selectIsLoading = createSelector(
  selectLoadingStatus,
  (status) => status === 'loading'
);

export const selectHasError = createSelector(
  selectLoadingStatus,
  selectError,
  (status, error) => status === 'failed' && error !== null
);

// ─── Filtered + Sorted Tasks (memoized) ──────────────────────────────────────

export const selectFilteredTasks = createSelector(
  selectAllTasks,
  selectFilters,
  (tasks, filters): Task[] => {
    let result = [...tasks];

    // Search
    if (filters.search.trim()) {
      const lower = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          (t.assignee?.toLowerCase().includes(lower) ?? false)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      result = result.filter((t) => t.type === filters.type);
    }

    // Sort
    result.sort((a, b) => {
      const field = filters.sortField;
      let cmp: number;
      if (field === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = a.updatedAt - b.updatedAt;
      }
      return filters.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }
);

export const selectPagedTasks = createSelector(
  selectFilteredTasks,
  selectFilters,
  (tasks, filters): Task[] => {
    const start = (filters.page - 1) * filters.pageSize;
    return tasks.slice(start, start + filters.pageSize);
  }
);

export const selectFilteredCount = createSelector(
  selectFilteredTasks,
  (tasks) => tasks.length
);

export const selectStatusCounts = createSelector(
  selectAllTasks,
  (tasks): Record<TaskStatus, number> => {
    const counts: Record<TaskStatus, number> = {
      [TaskStatus.Todo]: 0,
      [TaskStatus.InProgress]: 0,
      [TaskStatus.Done]: 0,
      [TaskStatus.QA]: 0,
      [TaskStatus.Blocked]: 0,
    };
    for (const task of tasks) {
      if (task.status in counts) counts[task.status]++;
    }
    return counts;
  }
);
