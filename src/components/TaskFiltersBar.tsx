'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFilter, resetFilters } from '@/features/tasks/taskSlice';
import { selectFilters } from '@/features/tasks/taskSelectors';
import { TaskStatus, TaskType, SortField, SortOrder } from '@/types/task';
import { getStatusLabel, getTypeLabel } from '@/utils/format';

const ALL_STATUSES: TaskStatus[] = [
  TaskStatus.Todo,
  TaskStatus.InProgress,
  TaskStatus.Done,
  TaskStatus.QA,
  TaskStatus.Blocked,
];

const ALL_TYPES: TaskType[] = [
  TaskType.Image,
  TaskType.Audio,
  TaskType.Text,
  TaskType.Unknown,
];

export function TaskFiltersBar(): React.ReactElement {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilter({ key: 'search', value: e.target.value }));
  };

  const handleStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilter({ key: 'status', value: e.target.value as TaskStatus | 'all' }));
  };

  const handleType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilter({ key: 'type', value: e.target.value as TaskType | 'all' }));
  };

  const handleSortField = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilter({ key: 'sortField', value: e.target.value as SortField }));
  };

  const handleSortOrder = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilter({ key: 'sortOrder', value: e.target.value as SortOrder }));
  };

  const handleReset = () => {
    dispatch(resetFilters());
  };

  return (
    <div className="filter-bar">
      {/* Search */}
      <div className="filter-group">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            id="task-search"
            type="text"
            placeholder="Search tasks or assignees…"
            value={filters.search}
            onChange={handleSearch}
            className="search-input"
            aria-label="Search tasks"
          />
        </div>
      </div>

      {/* Status filter */}
      <div className="filter-group">
        <label htmlFor="filter-status" className="filter-label">Status</label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={handleStatus}
          className="filter-select"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Type filter */}
      <div className="filter-group">
        <label htmlFor="filter-type" className="filter-label">Type</label>
        <select
          id="filter-type"
          value={filters.type}
          onChange={handleType}
          className="filter-select"
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {getTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Sort field */}
      <div className="filter-group">
        <label htmlFor="sort-field" className="filter-label">Sort by</label>
        <select
          id="sort-field"
          value={filters.sortField}
          onChange={handleSortField}
          className="filter-select"
          aria-label="Sort field"
        >
          <option value="updatedAt">Updated At</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Sort order */}
      <div className="filter-group">
        <label htmlFor="sort-order" className="filter-label">Order</label>
        <select
          id="sort-order"
          value={filters.sortOrder}
          onChange={handleSortOrder}
          className="filter-select"
          aria-label="Sort order"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* Reset */}
      <button
        id="reset-filters"
        onClick={handleReset}
        className="reset-btn"
        aria-label="Reset all filters"
      >
        Reset
      </button>
    </div>
  );
}
