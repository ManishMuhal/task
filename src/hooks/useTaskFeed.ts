'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  upsertTask,
  updateTaskAssignee,
  updateAnnotationCount,
  setWsConnected,
} from '@/features/tasks/taskSlice';
import { normalizeStatus } from '@/utils/normalize';
import { RawWsMessage } from '@/types/task';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function useTaskFeed(): void {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
  const isMountedRef = useRef(true);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: RawWsMessage;

      try {
        msg = JSON.parse(event.data as string) as RawWsMessage;
      } catch {
        console.warn('[WS] Could not parse message:', event.data);
        return;
      }

      // NOTE: Mock server uses `kind` field, not `type`
      switch (msg.kind) {
        case 'task.updated': {
          // Partial update: { id, status, updatedAt }
          // We do NOT have the full task here — update only what we know
          const { id, status, updatedAt } = msg.payload as {
            id: string;
            status: string;
            updatedAt: number;
          };
          if (!id) return;

          // updateTaskAssignee dispatches updateOne — gracefully ignores unknown IDs
          dispatch(
            upsertTask({
              id: String(id),
              // We only have partial data; merge in slice via upsertOne
              // Fields will be filled from existing entity + overrides
              status: normalizeStatus(status),
              updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
            } as Parameters<typeof upsertTask>[0])
          );
          break;
        }

        case 'task.assigned': {
          const { id, assignee } = msg.payload as {
            id: string;
            assignee: { id: string; name: string } | null;
          };
          if (!id) return;
          // Flatten assignee object to display name (or null)
          const assigneeName = assignee?.name ?? null;
          // Graceful: updateTaskAssignee no-ops if task not loaded yet
          dispatch(updateTaskAssignee({ taskId: String(id), assignee: assigneeName }));
          break;
        }

        case 'annotation.created': {
          const { taskId } = msg.payload as { taskId: string; by: string; at: number };
          if (!taskId) return;
          // We don't have the new count in this event — just mark an update happened
          // The next fetchTasks will get the real count
          // For now, increment optimistically
          dispatch(updateAnnotationCount({ taskId: String(taskId), count: -1 })); // -1 = increment signal
          break;
        }

        default:
          console.warn('[WS] Unknown event kind:', msg.kind);
      }
    },
    [dispatch]
  );

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) { ws.close(); return; }
        console.info('[WS] Connected');
        dispatch(setWsConnected(true));
        reconnectDelayRef.current = RECONNECT_DELAY_MS; // reset exponential backoff
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.warn('[WS] Error:', err);
      };

      ws.onclose = (ev) => {
        dispatch(setWsConnected(false));
        if (!isMountedRef.current) return;

        console.info(
          `[WS] Closed (${ev.code}). Reconnecting in ${reconnectDelayRef.current}ms…`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          // Exponential backoff: 3s → 6s → 12s → … → 30s max
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY_MS
          );
          connect();
        }, reconnectDelayRef.current);
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
    }
  }, [dispatch, handleMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);
}
