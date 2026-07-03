'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StatusBar } from '@/components/StatusBar';
import { TaskFiltersBar } from '@/components/TaskFiltersBar';
import { TaskTable } from '@/components/TaskTable';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { TaskTicker } from '@/components/TaskTicker';
import { useTaskFeed } from '@/hooks/useTaskFeed';
import { useTaskLoader } from '@/hooks/useTaskLoader';
import { useAppSelector } from '@/store/hooks';
import { selectSelectedTaskId } from '@/features/tasks/taskSelectors';

function DashboardContent(): React.ReactElement {
  // Initialize WS connection and task loading
  useTaskFeed();
  useTaskLoader();

  const selectedId = useAppSelector(selectSelectedTaskId);

  return (
    <div className="dashboard">
      {/* Top status bar */}
      <StatusBar />

      {/* Main layout */}
      <div className="dashboard-main">
        {/* Left: task list panel */}
        <section className="task-list-panel" aria-label="Task list">
          {/* Header */}
          <div className="panel-header">
            <h1 className="panel-title">
              <span className="panel-title-icon">📋</span>
              Annotation Tasks
            </h1>
            <TaskTicker />
          </div>

          {/* Filters */}
          <ErrorBoundary>
            <TaskFiltersBar />
          </ErrorBoundary>

          {/* Table */}
          <ErrorBoundary>
            <TaskTable />
          </ErrorBoundary>
        </section>

        {/* Right: detail panel (conditional) */}
        {selectedId && (
          <ErrorBoundary>
            <TaskDetailPanel />
          </ErrorBoundary>
        )}
        {!selectedId && (
          <div className="detail-panel detail-panel--empty">
            <div className="detail-empty-icon">👆</div>
            <p className="detail-empty-text">Select a task to view details and AI summary</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage(): React.ReactElement {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
