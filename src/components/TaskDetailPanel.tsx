'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedTaskId } from '@/features/tasks/taskSlice';
import { selectSelectedTask } from '@/features/tasks/taskSelectors';
import {
  selectSummaryContent,
  selectSummaryIsStreaming,
  selectSummaryError,
  selectSummaryTaskId,
} from '@/features/summary/summarySelectors';
import { useTaskSummary } from '@/hooks/useTaskSummary';
import { formatDate, getStatusLabel, getStatusColor, getTypeLabel, getTypeIcon, pluralize } from '@/utils/format';

// Dangerous tags to strip from AI-generated markdown
const BLOCKED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'form', 'input']);

// Build safe attribute map: strip all on* event handlers
function buildSafeAttributes(
  attrs: Record<string, (string | [string, ...string[]])[]>
): Record<string, (string | [string, ...string[]])[]> {
  return Object.fromEntries(
    Object.entries(attrs).map(([tag, attrList]) => [
      tag,
      attrList.filter((attr) => {
        if (typeof attr === 'string') return !attr.startsWith('on');
        return true; // Tuple-style attributes (e.g. ['class', ...]) are safe
      }),
    ])
  );
}

// Strict sanitization schema — disallows all HTML execution vectors
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tag) => !BLOCKED_TAGS.has(tag)),
  attributes: buildSafeAttributes(
    (defaultSchema.attributes ?? {}) as Record<string, (string | [string, ...string[]])[]>
  ),
};

function StreamingCursor(): React.ReactElement {
  return <span className="streaming-cursor" aria-hidden="true">▋</span>;
}

function SummarySection({ taskId }: { taskId: string | null }): React.ReactElement {
  useTaskSummary(taskId);

  const content = useAppSelector(selectSummaryContent);
  const isStreaming = useAppSelector(selectSummaryIsStreaming);
  const error = useAppSelector(selectSummaryError);
  const summaryTaskId = useAppSelector(selectSummaryTaskId);

  if (summaryTaskId !== taskId) return <></>;

  if (error) {
    return (
      <div className="summary-error">
        <span className="summary-error-icon">⚠️</span>
        <p>Failed to load summary: {error}</p>
      </div>
    );
  }

  if (!content && isStreaming) {
    return (
      <div className="summary-loading">
        <div className="summary-dots">
          <span /><span /><span />
        </div>
        <p className="summary-loading-text">Generating AI summary…</p>
      </div>
    );
  }

  if (!content) return <></>;

  return (
    <div className="summary-content" aria-live="polite" aria-label="AI Summary">
      <ReactMarkdown rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}>
        {content}
      </ReactMarkdown>
      {isStreaming && <StreamingCursor />}
    </div>
  );
}

export function TaskDetailPanel(): React.ReactElement {
  const dispatch = useAppDispatch();
  const task = useAppSelector(selectSelectedTask);

  const handleClose = () => {
    dispatch(setSelectedTaskId(null));
  };

  if (!task) {
    return (
      <div className="detail-panel detail-panel--empty">
        <div className="detail-empty-icon">👈</div>
        <p className="detail-empty-text">Select a task to view details</p>
      </div>
    );
  }

  return (
    <aside className="detail-panel" role="complementary" aria-label="Task detail">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-top">
          <span className="detail-type-icon">{getTypeIcon(task.type)}</span>
          <button
            className="detail-close-btn"
            onClick={handleClose}
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>
        <h2 className="detail-title">{task.title}</h2>
      </div>

      {/* Metadata grid */}
      <div className="detail-meta">
        <div className="meta-item">
          <span className="meta-label">Status</span>
          <span className={`status-badge ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Type</span>
          <span className="meta-value">{getTypeLabel(task.type)}</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Assignee</span>
          <span className="meta-value">
            {task.assignee ? (
              <div className="assignee-chip">
                <span className="assignee-avatar">
                  {task.assignee.charAt(0).toUpperCase()}
                </span>
                {task.assignee}
              </div>
            ) : (
              <span className="unassigned">Unassigned</span>
            )}
          </span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Annotations</span>
          <span className="meta-value annotation-count-large">
            {pluralize(task.annotationCount, 'annotation')}
          </span>
        </div>

        <div className="meta-item meta-item--full">
          <span className="meta-label">Last Updated</span>
          <span className="meta-value date-text">{formatDate(task.updatedAt)}</span>
        </div>

        {task.description && (
          <div className="meta-item meta-item--full">
            <span className="meta-label">Description</span>
            <p className="meta-description">{task.description}</p>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="summary-section">
        <div className="summary-header">
          <span className="summary-sparkle">✨</span>
          <h3 className="summary-title">AI Summary</h3>
        </div>
        <SummarySection taskId={task.id} />
      </div>
    </aside>
  );
}
