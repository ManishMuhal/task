import { RawTask, RawTaskListResponse, TaskFilters } from '@/types/task';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Note: The mock server only supports page + pageSize — search/filter/sort are client-side
function buildQuery(filters: Partial<TaskFilters>): string {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  return params.toString();
}

export const taskApi = {
  async getTasks(filters: Partial<TaskFilters> = {}): Promise<RawTaskListResponse> {
    const q = buildQuery(filters);
    const raw = await apiFetch<{
      items: RawTask[];   // actual field name from mock server
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/tasks${q ? `?${q}` : ''}`);

    // Normalize the response to our internal shape
    return {
      items: raw.items,
      total: raw.total,
      page: raw.page,
      pageSize: raw.pageSize,
    };
  },

  async getTaskById(id: string): Promise<RawTask> {
    return apiFetch<RawTask>(`/api/tasks/${id}`);
  },

  // Returns a ReadableStream for SSE streaming summary
  async getSummaryStream(id: string, signal: AbortSignal): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const res = await fetch(`${BASE_URL}/api/tasks/${id}/summary`, {
      signal,
      headers: { Accept: 'text/event-stream' },
    });

    if (!res.ok) {
      throw new Error(`Summary API ${res.status}`);
    }

    if (!res.body) {
      throw new Error('No response body for streaming');
    }

    return res.body.getReader();
  },
};

