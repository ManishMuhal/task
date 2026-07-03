'use client';

/**
 * TaskTicker — Fixed version with all bugs corrected.
 *
 * Original bugs (see DECISIONS.md for full explanations):
 *  1. Stale closure: interval captured old `tasks` snapshot
 *  2. State mutation: directly mutated state array
 *  3. Array mutation via sort: called .sort() on original array
 *  4. Invalid list key: used array index as key
 *  5. Fetch when selectedId is null: no null guard before fetching
 *  6. Duplicate tasks: upserted without deduplication
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAllTasks, selectSelectedTaskId } from '@/features/tasks/taskSelectors';
import { fetchTaskById } from '@/features/tasks/taskThunks';
import { Task } from '@/types/task';
import { getStatusColor, getStatusLabel, formatDate } from '@/utils/format';

const TICK_INTERVAL_MS = 5000;

export function TaskTicker(): React.ReactElement {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  // FIX #1: Use a ref to hold the latest tasks so interval always sees fresh data
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const selectedId = useAppSelector(selectSelectedTaskId);
  const [tickIndex, setTickIndex] = useState(0);

  // FIX #1 (continued): Wrap in useCallback with empty deps; use tasksRef inside
  const tick = useCallback(() => {
    setTickIndex((prev) => {
      const current = tasksRef.current;
      if (current.length === 0) return 0;
      return (prev + 1) % current.length;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  // FIX #5: Only fetch when selectedId is a non-null, non-empty string
  useEffect(() => {
    if (!selectedId) return;
    dispatch(fetchTaskById(selectedId));
  }, [dispatch, selectedId]);

  // FIX #3: Do NOT call sort() on the tasks array directly — it mutates.
  // FIX #2: Do NOT mutate state. Use a new sorted array.
  const sortedTasks = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  // FIX #6: Deduplicate by id using a Map
  const uniqueTasks = Array.from(
    new Map(sortedTasks.map((t) => [t.id, t])).values()
  );

  const displayTask = uniqueTasks[tickIndex % Math.max(uniqueTasks.length, 1)];

  return (
    <div className="task-ticker" aria-live="polite" aria-label="Recent task activity">
      <div className="ticker-label">Latest Activity</div>
      {displayTask ? (
        <div className="ticker-item">
          <span className="ticker-title">{displayTask.title}</span>
          <span className={`status-badge ${getStatusColor(displayTask.status)}`}>
            {getStatusLabel(displayTask.status)}
          </span>
          <span className="ticker-date">{formatDate(displayTask.updatedAt)}</span>
        </div>
      ) : (
        <div className="ticker-empty">No tasks to display</div>
      )}

      {/* FIX #4: Use stable task.id as key, NOT array index */}
      <div className="ticker-dots" role="tablist" aria-label="Task navigation">
        {uniqueTasks.slice(0, 5).map((task) => (
          <button
            key={task.id}  // ✅ Stable unique key
            role="tab"
            aria-selected={displayTask?.id === task.id}
            className={`ticker-dot ${displayTask?.id === task.id ? 'ticker-dot--active' : ''}`}
            onClick={() => {
              const idx = uniqueTasks.indexOf(task);
              setTickIndex(idx);
            }}
            aria-label={task.title}
          />
        ))}
      </div>
    </div>
  );
}
