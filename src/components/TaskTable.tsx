'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedTaskId } from '@/features/tasks/taskSlice';
import { setFilter } from '@/features/tasks/taskSlice';
import {
  selectPagedTasks,
  selectIsLoading,
  selectHasError,
  selectError,
  selectFilters,
  selectFilteredCount,
  selectIsStale,
} from '@/features/tasks/taskSelectors';
import { Task, TaskStatus } from '@/types/task';
import { formatDate, getStatusLabel, getStatusColor, getTypeLabel, getTypeIcon } from '@/utils/format';

function StatusBadge({ status }: { status: TaskStatus }): React.ReactElement {
  return (
    <span className={`status-badge ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function TaskRow({
  task,
  isSelected,
  onClick,
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <tr
      className={`task-row ${isSelected ? 'task-row--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <td className="task-cell task-cell--title">
        <div className="task-title-wrapper">
          <span className="task-type-icon" title={getTypeLabel(task.type)}>
            {getTypeIcon(task.type)}
          </span>
          <span className="task-title">{task.title}</span>
        </div>
      </td>
      <td className="task-cell task-cell--type">{getTypeLabel(task.type)}</td>
      <td className="task-cell">
        <StatusBadge status={task.status} />
      </td>
      <td className="task-cell task-cell--assignee">
        {task.assignee ? (
          <div className="assignee-chip">
            <span className="assignee-avatar">
              {task.assignee.charAt(0).toUpperCase()}
            </span>
            <span>{task.assignee}</span>
          </div>
        ) : (
          <span className="unassigned">Unassigned</span>
        )}
      </td>
      <td className="task-cell task-cell--count">
        <span className="annotation-count">{task.annotationCount}</span>
      </td>
      <td className="task-cell task-cell--date">
        <span className="date-text">{formatDate(task.updatedAt)}</span>
      </td>
    </tr>
  );
}

function LoadingSkeleton(): React.ReactElement {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="task-row skeleton-row">
          <td className="task-cell" colSpan={6}>
            <div className="skeleton-bar" style={{ width: `${60 + Math.random() * 30}%` }} />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }): React.ReactElement {
  return (
    <tbody>
      <tr>
        <td colSpan={6}>
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">
              {isFiltered ? 'No tasks match your filters' : 'No tasks found'}
            </h3>
            <p className="empty-subtitle">
              {isFiltered
                ? 'Try adjusting your search or filter criteria.'
                : 'Tasks will appear here once the backend is connected.'}
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

function ErrorState({ message }: { message: string }): React.ReactElement {
  return (
    <tbody>
      <tr>
        <td colSpan={6}>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Failed to load tasks</h3>
            <p className="error-message">{message}</p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

function Pagination({
  filteredCount,
  page,
  pageSize,
}: {
  filteredCount: number;
  page: number;
  pageSize: number;
}): React.ReactElement {
  const dispatch = useAppDispatch();
  const totalPages = Math.ceil(filteredCount / pageSize);

  const go = (p: number) => {
    dispatch(setFilter({ key: 'page', value: p }));
  };

  if (totalPages <= 1) return <></>;

  return (
    <div className="pagination">
      <span className="pagination-info">
        {filteredCount} task{filteredCount !== 1 ? 's' : ''}
      </span>
      <div className="pagination-controls">
        <button
          className="page-btn"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`page-btn ${page === p ? 'page-btn--active' : ''}`}
                onClick={() => go(p as number)}
                aria-label={`Page ${p}`}
                aria-current={page === p ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        <button
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function TaskTable(): React.ReactElement {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectPagedTasks);
  const isLoading = useAppSelector(selectIsLoading);
  const hasError = useAppSelector(selectHasError);
  const error = useAppSelector(selectError);
  const filters = useAppSelector(selectFilters);
  const filteredCount = useAppSelector(selectFilteredCount);
  const isStale = useAppSelector(selectIsStale);
  const selectedTaskId = useAppSelector((s) => s.tasks.selectedTaskId);

  const isFiltered =
    filters.search !== '' || filters.status !== 'all' || filters.type !== 'all';

  const handleSelect = (id: string) => {
    dispatch(setSelectedTaskId(id));
  };

  const handleSort = (field: 'updatedAt' | 'title') => {
    if (filters.sortField === field) {
      dispatch(
        setFilter({
          key: 'sortOrder',
          value: filters.sortOrder === 'asc' ? 'desc' : 'asc',
        })
      );
    } else {
      dispatch(setFilter({ key: 'sortField', value: field }));
      dispatch(setFilter({ key: 'sortOrder', value: 'desc' }));
    }
  };

  const SortIcon = ({ field }: { field: 'updatedAt' | 'title' }) => {
    if (filters.sortField !== field) return <span className="sort-icon sort-icon--inactive">↕</span>;
    return (
      <span className="sort-icon sort-icon--active">
        {filters.sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="table-container">
      {isStale && (
        <div className="stale-banner" role="status">
          <span className="stale-dot" />
          Showing cached data — refreshing…
        </div>
      )}

      <div className="table-wrapper">
        <table className="task-table" role="table" aria-label="Task list">
          <thead>
            <tr>
              <th
                className="th th--sortable"
                onClick={() => handleSort('title')}
                aria-sort={
                  filters.sortField === 'title'
                    ? filters.sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                Title <SortIcon field="title" />
              </th>
              <th className="th">Type</th>
              <th className="th">Status</th>
              <th className="th">Assignee</th>
              <th className="th">Annotations</th>
              <th
                className="th th--sortable"
                onClick={() => handleSort('updatedAt')}
                aria-sort={
                  filters.sortField === 'updatedAt'
                    ? filters.sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                Updated <SortIcon field="updatedAt" />
              </th>
            </tr>
          </thead>

          {isLoading && !tasks.length ? (
            <LoadingSkeleton />
          ) : hasError ? (
            <ErrorState message={error ?? 'Unknown error'} />
          ) : tasks.length === 0 ? (
            <EmptyState isFiltered={isFiltered} />
          ) : (
            <tbody>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onClick={() => handleSelect(task.id)}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>

      <Pagination
        filteredCount={filteredCount}
        page={filters.page}
        pageSize={filters.pageSize}
      />
    </div>
  );
}
