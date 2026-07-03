'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTasks } from '@/features/tasks/taskThunks';
import { loadCachedTasks } from '@/features/tasks/taskSlice';
import { selectFilters } from '@/features/tasks/taskSelectors';
import { taskCache } from '@/lib/cache';
import { Task, PaginationMeta } from '@/types/task';

interface CachedTaskData {
  tasks: Task[];
  meta: PaginationMeta;
}

export function useTaskLoader(): void {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);

  useEffect(() => {
    // 1. Try to load from IndexedDB cache immediately (non-blocking)
    taskCache.get<CachedTaskData>('task-list').then((cached) => {
      if (cached) {
        dispatch(loadCachedTasks(cached));
      }
    }).catch(() => {});

    // 2. Revalidate from API (stale-while-revalidate)
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);
}
