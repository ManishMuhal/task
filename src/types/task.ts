// ─── Raw API shape (messy from backend) ──────────────────────────────────────

// Assignee from mock server is { id: string; name: string } | null
export interface RawAssignee {
  id: string;
  name: string;
}

export interface RawTask {
  id: string;
  title: string;
  type: string; // may be 'image' | 'audio' | 'text' | 'video' | unknown
  status: string; // inconsistent casing: 'InProgress' | 'done' | 'QA' | 'BLOCKED' etc.
  annotationCount: string | number; // sometimes a string
  updatedAt: string | number;       // ISO string or epoch ms
  assignee: RawAssignee | null;     // { id, name } object or null
  meta?: Record<string, unknown>;   // free-form extra field
}

// The real API response uses `items`, not `tasks`
export interface RawTaskListResponse {
  items: RawTask[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Domain Enums ─────────────────────────────────────────────────────────────

export enum TaskType {
  Image = 'image',
  Audio = 'audio',
  Text = 'text',
  Unknown = 'unknown',
}

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done',
  QA = 'qa',
  Blocked = 'blocked',
}

// ─── Domain Model ─────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  annotationCount: number;
  updatedAt: number; // always epoch ms
  assignee: string | null;
  description: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Filters / Sort ──────────────────────────────────────────────────────────

export type SortField = 'updatedAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  type: TaskType | 'all';
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────
// The mock server sends { kind: '...', payload: {...} } — field is 'kind' not 'type'

export interface TaskUpdatedEvent {
  kind: 'task.updated';
  // partial update: only id, status, updatedAt guaranteed
  payload: { id: string; status: string; updatedAt: number };
}

export interface TaskAssignedEvent {
  kind: 'task.assigned';
  payload: { id: string; assignee: RawAssignee | null };
}

export interface AnnotationCreatedEvent {
  kind: 'annotation.created';
  payload: { taskId: string; by: string; at: number };
}

export type WsEvent =
  | TaskUpdatedEvent
  | TaskAssignedEvent
  | AnnotationCreatedEvent;

// Raw WS message shape (kind discriminator)
export interface RawWsMessage {
  kind: string;
  payload: Record<string, unknown>;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface SummaryState {
  taskId: string | null;
  content: string;
  isStreaming: boolean;
  error: string | null;
}
