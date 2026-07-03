import { normalizeTask, normalizeTasks } from '@/utils/normalize';
import { TaskStatus, TaskType, RawTask } from '@/types/task';

function makeRaw(overrides: Partial<RawTask> = {}): RawTask {
  return {
    id: '1',
    title: 'Test Task',
    type: 'image',
    status: 'in_progress',
    annotationCount: 5,
    updatedAt: '2024-01-15T10:30:00Z',
    assignee: 'alice',
    ...overrides,
  };
}

describe('normalizeTask', () => {
  // ─── Status normalization ────────────────────────────────────────────────

  test.each([
    ['in_progress', TaskStatus.InProgress],
    ['InProgress', TaskStatus.InProgress],
    ['INPROGRESS', TaskStatus.InProgress],
    ['done', TaskStatus.Done],
    ['DONE', TaskStatus.Done],
    ['QA', TaskStatus.QA],
    ['qa', TaskStatus.QA],
    ['BLOCKED', TaskStatus.Blocked],
    ['blocked', TaskStatus.Blocked],
    ['todo', TaskStatus.Todo],
    ['TODO', TaskStatus.Todo],
    ['garbage_value', TaskStatus.Todo],  // unknown -> Todo default
    ['', TaskStatus.Todo],
  ])('normalizes status "%s" → %s', (raw, expected) => {
    const result = normalizeTask(makeRaw({ status: raw }));
    expect(result.status).toBe(expected);
  });

  // ─── Type normalization ──────────────────────────────────────────────────

  test.each([
    ['image', TaskType.Image],
    ['IMAGE', TaskType.Image],
    ['audio', TaskType.Audio],
    ['Audio', TaskType.Audio],
    ['text', TaskType.Text],
    ['TEXT', TaskType.Text],
    ['video', TaskType.Unknown],       // unknown type → Unknown
    ['unknown', TaskType.Unknown],
    ['', TaskType.Unknown],
  ])('normalizes type "%s" → %s', (raw, expected) => {
    const result = normalizeTask(makeRaw({ type: raw }));
    expect(result.type).toBe(expected);
  });

  // ─── annotationCount normalization ───────────────────────────────────────

  test('handles numeric annotationCount', () => {
    const result = normalizeTask(makeRaw({ annotationCount: 42 }));
    expect(result.annotationCount).toBe(42);
    expect(typeof result.annotationCount).toBe('number');
  });

  test('handles string annotationCount', () => {
    const result = normalizeTask(makeRaw({ annotationCount: '17' }));
    expect(result.annotationCount).toBe(17);
    expect(typeof result.annotationCount).toBe('number');
  });

  test('handles invalid annotationCount string → 0', () => {
    const result = normalizeTask(makeRaw({ annotationCount: 'NaN_value' }));
    expect(result.annotationCount).toBe(0);
  });

  // ─── updatedAt normalization ─────────────────────────────────────────────

  test('handles ISO string updatedAt', () => {
    const isoString = '2024-01-15T10:30:00Z';
    const result = normalizeTask(makeRaw({ updatedAt: isoString }));
    expect(result.updatedAt).toBe(Date.parse(isoString));
    expect(typeof result.updatedAt).toBe('number');
  });

  test('handles epoch milliseconds updatedAt', () => {
    const epochMs = 1705312200000;
    const result = normalizeTask(makeRaw({ updatedAt: epochMs }));
    expect(result.updatedAt).toBe(epochMs);
  });

  test('handles epoch seconds updatedAt (converts to ms)', () => {
    const epochSec = 1705312200; // 10 digits
    const result = normalizeTask(makeRaw({ updatedAt: epochSec }));
    expect(result.updatedAt).toBe(epochSec * 1000);
  });

  test('handles invalid ISO string → falls back to now-ish', () => {
    const before = Date.now();
    const result = normalizeTask(makeRaw({ updatedAt: 'not-a-date' }));
    const after = Date.now();
    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
    expect(result.updatedAt).toBeLessThanOrEqual(after);
  });

  // ─── Assignee ────────────────────────────────────────────────────────────
  // Mock server sends { id: string; name: string } object or null

  test('flattens assignee object to display name', () => {
    const result = normalizeTask(
      makeRaw({ assignee: { id: 'u1', name: 'Asha' } as unknown as string })
    );
    expect(result.assignee).toBe('Asha');
  });

  test('normalizes null assignee to null', () => {
    const result = normalizeTask(makeRaw({ assignee: null }));
    expect(result.assignee).toBeNull();
  });

  test('handles string assignee gracefully (legacy fallback)', () => {
    const result = normalizeTask(makeRaw({ assignee: 'bob' as unknown as string }));
    expect(result.assignee).toBe('bob');
  });

  // ─── Id coercion ─────────────────────────────────────────────────────────

  test('coerces numeric id to string', () => {
    const result = normalizeTask(makeRaw({ id: 99 as unknown as string }));
    expect(result.id).toBe('99');
    expect(typeof result.id).toBe('string');
  });

  // ─── Does not crash on missing fields ────────────────────────────────────

  test('does not crash when all fields are undefined/null', () => {
    expect(() =>
      normalizeTask({
        id: '1',
        title: '',
        type: undefined as unknown as string,
        status: undefined as unknown as string,
        annotationCount: undefined as unknown as number,
        updatedAt: undefined as unknown as string,
        assignee: null,
      })
    ).not.toThrow();
  });
});

describe('normalizeTasks', () => {
  test('maps an array of raw tasks', () => {
    const raws = [makeRaw({ id: '1' }), makeRaw({ id: '2' })];
    const result = normalizeTasks(raws);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  test('returns empty array for empty input', () => {
    expect(normalizeTasks([])).toEqual([]);
  });
});
