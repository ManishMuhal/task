'use client';

import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectWsConnected, selectIsStale } from '@/features/tasks/taskSelectors';
import { selectSummaryIsStreaming } from '@/features/summary/summarySelectors';

export function StatusBar(): React.ReactElement {
  const wsConnected = useAppSelector(selectWsConnected);
  const isStale = useAppSelector(selectIsStale);
  const isSummaryStreaming = useAppSelector(selectSummaryIsStreaming);

  return (
    <div className="status-bar">
      <div className="status-indicators">
        {/* WebSocket status */}
        <div
          className={`status-indicator ${wsConnected ? 'status-indicator--connected' : 'status-indicator--disconnected'}`}
          title={wsConnected ? 'Live updates active' : 'WebSocket disconnected – reconnecting…'}
          role="status"
          aria-label={wsConnected ? 'Live feed connected' : 'Live feed disconnected'}
        >
          <span className="status-dot" />
          <span className="status-text">{wsConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Stale data indicator */}
        {isStale && (
          <div className="status-indicator status-indicator--stale" role="status" aria-label="Showing stale data">
            <span className="status-dot status-dot--stale" />
            <span className="status-text">Stale</span>
          </div>
        )}

        {/* Streaming indicator */}
        {isSummaryStreaming && (
          <div className="status-indicator status-indicator--streaming" role="status" aria-label="Streaming AI summary">
            <span className="status-dot status-dot--streaming" />
            <span className="status-text">Streaming</span>
          </div>
        )}
      </div>

      <span className="app-tagline">Annotation Activity Console</span>
    </div>
  );
}
