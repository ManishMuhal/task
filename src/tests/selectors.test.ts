import { configureStore } from '@reduxjs/toolkit';
import taskReducer, { tasksAdapter, loadCachedTasks, setFilter } from '@/features/tasks/taskSlice';
import summaryReducer from '@/features/summary/summarySlice';
import {
  selectAllTasks,
  selectFilteredTasks,
  selectPagedTasks,
  selectSelectedTask,
  selectFilteredCount,
  selectStatusCounts,
  selectIsLoading,
} from '@/features/tasks/taskSelectors';
import { Task, TaskStatus, TaskType, PaginationMeta } from '@/types/task';

function makeStore() {
  return configureStore({
    reducer: { tasks: taskReducer, summary: summaryReducer },
  });
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Default Task',
    type: TaskType.Image,
    status: TaskStatus.InProgress,
    annotationCount: 5,
    updatedAt: 1705312200000,
    assignee: 'alice',
    description: '',
    ...overrides,
  };
}

const mockMeta: PaginationMeta = { total: 3, page: 1, pageSize: 10, totalPages: 1 };

describe('taskSelectors', () => {
  describe('selectAllTasks', () => {
    test('returns all loaded tasks', () => {
      const store = makeStore();
      const tasks = [
        makeTask({ id: '1', title: 'Alpha' }),
        makeTask({ id: '2', title: 'Beta' }),
      ];
      store.dispatch(loadCachedTasks({ tasks, meta: mockMeta }));
      expect(selectAllTasks(store.getState())).toHaveLength(2);
    });

    test('returns empty array initially', () => {
      const store = makeStore();
      expect(selectAllTasks(store.getState())).toEqual([]);
    });
  });

  describe('selectFilteredTasks', () => {
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
      store = makeStore();
      const tasks = [
        makeTask({ id: '1', title: 'Alpha Image', type: TaskType.Image, status: TaskStatus.Todo, updatedAt: 1000 }),
        makeTask({ id: '2', title: 'Beta Audio', type: TaskType.Audio, status: TaskStatus.Done, updatedAt: 2000 }),
        makeTask({ id: '3', title: 'Gamma Text', type: TaskType.Text, status: TaskStatus.Blocked, assignee: 'charlie', updatedAt: 3000 }),
      ];
      store.dispatch(loadCachedTasks({ tasks, meta: mockMeta }));
    });

    test('returns all tasks when no filter active', () => {
      const result = selectFilteredTasks(store.getState());
      expect(result).toHaveLength(3);
    });

    test('filters by search on title', () => {
      store.dispatch(setFilter({ key: 'search', value: 'alpha' }));
      const result = selectFilteredTasks(store.getState());
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Alpha Image');
    });

    test('filters by search on assignee', () => {
      store.dispatch(setFilter({ key: 'search', value: 'charlie' }));
      const result = selectFilteredTasks(store.getState());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    test('filters by status', () => {
      store.dispatch(setFilter({ key: 'status', value: TaskStatus.Done }));
      const result = selectFilteredTasks(store.getState());
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TaskStatus.Done);
    });

    test('filters by type', () => {
      store.dispatch(setFilter({ key: 'type', value: TaskType.Audio }));
      const result = selectFilteredTasks(store.getState());
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(TaskType.Audio);
    });

    test('sorts by updatedAt desc', () => {
      store.dispatch(setFilter({ key: 'sortField', value: 'updatedAt' }));
      store.dispatch(setFilter({ key: 'sortOrder', value: 'desc' }));
      const result = selectFilteredTasks(store.getState());
      expect(result[0].updatedAt).toBeGreaterThan(result[1].updatedAt);
    });

    test('sorts by updatedAt asc', () => {
      store.dispatch(setFilter({ key: 'sortField', value: 'updatedAt' }));
      store.dispatch(setFilter({ key: 'sortOrder', value: 'asc' }));
      const result = selectFilteredTasks(store.getState());
      expect(result[0].updatedAt).toBeLessThan(result[1].updatedAt);
    });

    test('sorts by title asc', () => {
      store.dispatch(setFilter({ key: 'sortField', value: 'title' }));
      store.dispatch(setFilter({ key: 'sortOrder', value: 'asc' }));
      const result = selectFilteredTasks(store.getState());
      expect(result[0].title).toBe('Alpha Image');
      expect(result[1].title).toBe('Beta Audio');
      expect(result[2].title).toBe('Gamma Text');
    });

    test('combines search + status filter', () => {
      store.dispatch(setFilter({ key: 'search', value: 'a' }));
      store.dispatch(setFilter({ key: 'status', value: TaskStatus.Done }));
      const result = selectFilteredTasks(store.getState());
      // "Beta Audio" matches 'a' and has status Done
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('selectPagedTasks', () => {
    test('paginates correctly', () => {
      const store = makeStore();
      const tasks = Array.from({ length: 15 }, (_, i) =>
        makeTask({ id: String(i), title: `Task ${i}`, updatedAt: i * 1000 })
      );
      store.dispatch(loadCachedTasks({ tasks, meta: mockMeta }));
      store.dispatch(setFilter({ key: 'pageSize', value: 5 }));
      store.dispatch(setFilter({ key: 'page', value: 1 }));

      const page1 = selectPagedTasks(store.getState());
      expect(page1).toHaveLength(5);

      store.dispatch(setFilter({ key: 'page', value: 2 }));
      const page2 = selectPagedTasks(store.getState());
      expect(page2).toHaveLength(5);
      // No overlap
      const page1Ids = new Set(page1.map((t) => t.id));
      page2.forEach((t) => expect(page1Ids.has(t.id)).toBe(false));
    });
  });

  describe('selectSelectedTask', () => {
    test('returns null when no task selected', () => {
      const store = makeStore();
      expect(selectSelectedTask(store.getState())).toBeNull();
    });

    test('returns task when selectedTaskId matches', () => {
      const store = makeStore();
      const task = makeTask({ id: 'abc' });
      store.dispatch(loadCachedTasks({ tasks: [task], meta: mockMeta }));
      store.dispatch({ type: 'tasks/setSelectedTaskId', payload: 'abc' });
      expect(selectSelectedTask(store.getState())).toEqual(task);
    });
  });

  describe('selectStatusCounts', () => {
    test('counts each status correctly', () => {
      const store = makeStore();
      const tasks = [
        makeTask({ id: '1', status: TaskStatus.Todo }),
        makeTask({ id: '2', status: TaskStatus.Done }),
        makeTask({ id: '3', status: TaskStatus.Done }),
        makeTask({ id: '4', status: TaskStatus.Blocked }),
      ];
      store.dispatch(loadCachedTasks({ tasks, meta: mockMeta }));
      const counts = selectStatusCounts(store.getState());
      expect(counts[TaskStatus.Todo]).toBe(1);
      expect(counts[TaskStatus.Done]).toBe(2);
      expect(counts[TaskStatus.Blocked]).toBe(1);
      expect(counts[TaskStatus.InProgress]).toBe(0);
    });
  });

  describe('selectIsLoading', () => {
    test('is false initially', () => {
      const store = makeStore();
      expect(selectIsLoading(store.getState())).toBe(false);
    });
  });
});
