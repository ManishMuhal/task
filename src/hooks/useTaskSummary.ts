'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  startStream,
  appendChunk,
  completeStream,
  setStreamError,
} from '@/features/summary/summarySlice';
import { taskApi } from '@/services/taskApi';
import { summaryCache } from '@/lib/cache';

export function useTaskSummary(taskId: string | null): void {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamSummary = useCallback(
    async (id: string) => {
      // Cancel any previous stream before starting a new one
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      dispatch(startStream(id));

      // 1. Check summary cache first (IndexedDB)
      try {
        const cached = await summaryCache.get(id);
        if (cached && !controller.signal.aborted) {
          dispatch(appendChunk(cached));
          dispatch(completeStream());
          return;
        }
      } catch {
        // Cache miss — proceed to stream from API
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        const reader = await taskApi.getSummaryStream(id, controller.signal);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const rawText = decoder.decode(value, { stream: true });

          // ─── SSE Parsing ───────────────────────────────────────────────
          // Mock server sends: data: "JSON-encoded string"\n\n
          // Also handles: event: done\ndata: end\n\n (termination)
          const lines = rawText.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: done')) {
              // Stream complete signal from server
              break;
            }

            if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();

              if (rawData === 'end') {
                // Termination signal
                break;
              }

              let text: string;
              try {
                // Mock server JSON-encodes each chunk: data: "## Summary...\n\n"
                text = JSON.parse(rawData) as string;
              } catch {
                // Fallback: if not JSON, use raw (plain text SSE)
                text = rawData;
              }

              if (text && !controller.signal.aborted) {
                fullContent += text;
                dispatch(appendChunk(text));
              }
            }
          }
        }

        if (!controller.signal.aborted) {
          dispatch(completeStream());
          // Cache the complete content for future fast loads
          summaryCache.set(id, fullContent).catch(() => {});
        }
      } catch (err) {
        if (controller.signal.aborted) {
          // Expected cancellation when task changes — do NOT set error
          return;
        }
        const message = err instanceof Error ? err.message : 'Streaming failed';
        dispatch(setStreamError(message));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (!taskId) return;
    streamSummary(taskId);

    return () => {
      // Abort ongoing stream when task changes or component unmounts
      abortControllerRef.current?.abort();
    };
  }, [taskId, streamSummary]);
}
