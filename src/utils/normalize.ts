import { RawTask, RawAssignee, Task, TaskStatus, TaskType } from '@/types/task';

// ─── Status Normalization ─────────────────────────────────────────────────────
// Mock server sends: "in_progress", "InProgress", "done", "QA", "todo", "BLOCKED"

const STATUS_MAP: Record<string, TaskStatus> = {
  todo: TaskStatus.Todo,
  in_progress: TaskStatus.InProgress,
  inprogress: TaskStatus.InProgress,
  done: TaskStatus.Done,
  qa: TaskStatus.QA,
  blocked: TaskStatus.Blocked,
};

export function normalizeStatus(raw: string): TaskStatus {
  if (!raw) return TaskStatus.Todo;
  // lowercase, strip hyphens/underscores for lookup
  const key = raw.toLowerCase().replace(/[-\s]/g, '_');
  // Also try without underscores for "InProgress" -> "inprogress"
  const keyNoUnderscore = raw.toLowerCase().replace(/[-_\s]/g, '');
  return STATUS_MAP[key] ?? STATUS_MAP[keyNoUnderscore] ?? TaskStatus.Todo;
}

// ─── Type Normalization ───────────────────────────────────────────────────────
// Mock server sends: "image", "audio", "text", "video" (unknown)
// i % 11 === 0 tasks get "video" which is intentionally unknown

const TYPE_MAP: Record<string, TaskType> = {
  image: TaskType.Image,
  audio: TaskType.Audio,
  text: TaskType.Text,
};

function normalizeType(raw: string): TaskType {
  if (!raw) return TaskType.Unknown;
  return TYPE_MAP[raw.toLowerCase()] ?? TaskType.Unknown;
}

// ─── updatedAt Normalization ──────────────────────────────────────────────────
// Mock server alternates: ISO strings (even i) vs epoch ms numbers (odd i)

function normalizeUpdatedAt(raw: string | number): number {
  if (typeof raw === 'number') {
    // Epoch seconds (< 1e12) vs milliseconds (>= 1e12)
    return raw < 1_000_000_000_000 ? raw * 1000 : raw;
  }
  const parsed = Date.parse(raw);
  return isNaN(parsed) ? Date.now() : parsed;
}

// ─── annotationCount Normalization ────────────────────────────────────────────
// Mock server sends i % 3 === 0 as String(i), rest as number

function normalizeAnnotationCount(raw: string | number): number {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return isNaN(n) || n < 0 ? 0 : n;
}

// ─── Assignee Normalization ───────────────────────────────────────────────────
// Mock server USERS array is [{ id, name } | null]
// We flatten to string (the name) or null for display

function normalizeAssignee(raw: RawAssignee | null | unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw; // defensive: handle old string format
  if (typeof raw === 'object' && raw !== null && 'name' in raw) {
    return String((raw as RawAssignee).name);
  }
  return null;
}

// ─── Main Normalizer ──────────────────────────────────────────────────────────

export function normalizeTask(raw: RawTask): Task {
  return {
    id: String(raw.id ?? ''),
    title: raw.title ?? 'Untitled',
    type: normalizeType(raw.type ?? ''),
    status: normalizeStatus(raw.status ?? ''),
    annotationCount: normalizeAnnotationCount(raw.annotationCount ?? 0),
    updatedAt: normalizeUpdatedAt(raw.updatedAt ?? Date.now()),
    assignee: normalizeAssignee(raw.assignee),
    description: '', // mock server doesn't return description; default empty
  };
}

export function normalizeTasks(raws: RawTask[]): Task[] {
  return raws.map(normalizeTask);
}
