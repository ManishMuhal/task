# DECISIONS.md — Architecture & Engineering Decisions

## TaskTicker Bug Fix Report

The original `TaskTicker.tsx` contained 6 bugs. Each is documented below.

---

### Bug 1: Stale Closure

**Problem:**
```tsx
// ❌ tasks captured at the time useEffect ran — never updates
const tasks = useAppSelector(selectAllTasks);

useEffect(() => {
  const id = setInterval(() => {
    // tasks is stale here — always references the initial render's tasks array
    setTickIndex((prev) => (prev + 1) % tasks.length);
  }, 5000);
  return () => clearInterval(id);
}, []); // empty deps — tasks never re-captured
```

The interval callback closes over the initial `tasks` value and never sees Redux updates.

**Fix:**
```tsx
// ✅ Use a ref to always hold the latest value
const tasksRef = useRef<Task[]>(tasks);
useEffect(() => { tasksRef.current = tasks; }, [tasks]);

// Inside interval: read from ref, not the closed-over variable
setTickIndex((prev) => (prev + 1) % Math.max(tasksRef.current.length, 1));
```

---

### Bug 2: State Mutation

**Problem:**
```tsx
// ❌ Direct mutation of state-derived array
const allTasks = useAppSelector(selectAllTasks);
allTasks.push(newTask); // mutates the selector result — Redux state violation
```

Redux state must never be mutated outside a reducer. Mutating selector results can cause React to miss re-renders and corrupt the store.

**Fix:**
```tsx
// ✅ Always create new arrays
const sorted = [...tasks].sort(...);
```

---

### Bug 3: Array Mutation via `.sort()`

**Problem:**
```tsx
// ❌ .sort() mutates the original array in-place
const sorted = tasks.sort((a, b) => b.updatedAt - a.updatedAt);
```

`Array.prototype.sort()` mutates the original array. When `tasks` is derived from Redux state via a selector, this silently corrupts the memoized value.

**Fix:**
```tsx
// ✅ Spread first to create a copy before sorting
const sortedTasks = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);
```

---

### Bug 4: Invalid List Key

**Problem:**
```tsx
// ❌ Array index is unstable — causes React reconciliation bugs
{tasks.map((task, index) => (
  <button key={index} ...>  {/* index is NOT a stable identity */}
```

When the tasks array reorders (e.g., after sort), React sees the same keys at different positions and incorrectly reuses DOM nodes, causing wrong state association and missed animations.

**Fix:**
```tsx
// ✅ Use the stable, unique task.id
{tasks.map((task) => (
  <button key={task.id} ...>
```

---

### Bug 5: Fetching When `selectedId` Is Null

**Problem:**
```tsx
// ❌ No null guard — fires an API request for "null"
useEffect(() => {
  dispatch(fetchTaskById(selectedId)); // selectedId can be null
}, [selectedId]);
```

This sends `GET /api/tasks/null` to the backend whenever no task is selected.

**Fix:**
```tsx
// ✅ Guard with early return
useEffect(() => {
  if (!selectedId) return; // null, undefined, empty string — all safe
  dispatch(fetchTaskById(selectedId));
}, [dispatch, selectedId]);
```

---

### Bug 6: Duplicate Tasks Issue

**Problem:**
```tsx
// ❌ Naive concat causes duplicates when WS upserts arrive
const displayed = [...loadedTasks, ...wsTasks];
```

WebSocket events for existing tasks would be appended instead of replacing, resulting in duplicate rows.

**Fix:**
Use `createEntityAdapter.upsertOne` in the Redux slice, which guarantees deduplication by ID. In TaskTicker, a Map ensures uniqueness:
```tsx
// ✅ Map deduplicates by key
const uniqueTasks = Array.from(
  new Map(sortedTasks.map((t) => [t.id, t])).values()
);
```

---

## Architecture Decisions

### Why Redux Toolkit?

RTK provides the best ergonomics for complex shared state:
- `createSlice` eliminates boilerplate
- `createAsyncThunk` handles loading/error lifecycle
- `createSelector` gives memoized derivations
- `createEntityAdapter` solves normalized storage

Alternatives considered:
- **Zustand**: simpler API but lacks entity normalization primitives
- **React Query**: excellent for server state, but WS merge and local filter state require extra coordination
- **Context + useReducer**: doesn't scale to multiple concurrent concerns (WS, streaming, filters, cache)

### Why `createEntityAdapter`?

WebSocket events deliver partial updates (individual task mutations). With a normalized store (`{ ids: [...], entities: { [id]: Task } }`):
- `upsertOne` merges partial WS updates in O(1)
- No need to scan arrays — entity lookup by ID is instant
- `selectAll` always returns entities in a consistent order
- Prevents duplicate entries automatically

### Normalization Strategy

Backend data has 5 known inconsistencies. `normalizeTask()` in `utils/normalize.ts` handles each:

| Field | Problem | Solution |
|-------|---------|----------|
| `status` | Mixed casing: `in_progress`, `InProgress`, `BLOCKED` | Lowercase + strip non-alphanumeric → lookup table |
| `type` | Unknown values like `video` | Map to `TaskType.Unknown` (safe fallback) |
| `annotationCount` | String or number: `"47"`, `47` | `parseInt()` with NaN fallback to `0` |
| `updatedAt` | ISO string or epoch (sec/ms) | `Date.parse()` for strings; `< 1e12` check for sec vs ms |
| `assignee` | May be `null` | Preserved as `null` in domain model |

Unknown values **never crash** — they fall back to safe defaults.

### WebSocket Merge Strategy

WS events are dispatched directly to Redux:
- `task.updated` → `upsertOne(normalizeTask(payload))`
- `task.assigned` → `updateOne` targeting only the `assignee` field
- `annotation.created` → `updateOne` targeting only `annotationCount`

**Graceful handling of unloaded tasks:** `updateTaskAssignee` and `updateAnnotationCount` check `state.entities[taskId]` before updating — unknown IDs are silently ignored.

Reconnect uses exponential backoff: `3s → 6s → 12s → … → 30s max`.

### Streaming Strategy

1. Check `summaryCache` (IndexedDB) first → return immediately if found
2. Call `GET /api/tasks/:id/summary` with `AbortController`
3. Parse `ReadableStream` chunks — handles both SSE (`data: ...`) and raw text
4. Dispatch `appendChunk` on each chunk → Redux state → component re-renders
5. On task change: `controller.abort()` → stream tears down cleanly
6. On completion: write to `summaryCache` for future use

Aborted streams do NOT set error state (expected cancellation).

### Security & Sanitization

All AI summary markdown is rendered through:
```tsx
<ReactMarkdown rehypePlugins={[[rehypeSanitize, customSchema]]}>
```

The custom schema extends `defaultSchema` and additionally:
- Removes `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`
- Strips all `on*` event attributes (`onclick`, `onload`, etc.)

This prevents XSS, script injection, and raw HTML execution even if the AI backend is compromised.

### IndexedDB Strategy (localforage)

**Pattern: Stale-While-Revalidate**

1. On mount: read `task-list` from IndexedDB → dispatch `loadCachedTasks` → marks state as `isStale: true`
2. Immediately: fetch from API → on success, overwrite entities → `isStale: false`
3. UI shows stale banner while fresh data loads
4. Cache writes happen as fire-and-forget (never block the UI)
5. TTL: 5 minutes (stale entries auto-evicted on read)

Two separate stores:
- `task-cache`: task list + pagination meta
- `summary-cache`: AI summaries (no TTL — content doesn't change)

### Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Client-side filter/sort in selectors | Simpler UX but doesn't scale to millions of tasks. For large datasets, server-side filtering would be needed. |
| Full RTK slice for streaming | Overkill for simple streaming; `useReducer` + `useContext` would suffice. RTK chosen for consistency. |
| Single WS connection (hook-level) | Simple but doesn't support multiple concurrent feeds. Would need a connection manager for production multi-feed scenarios. |
| localforage as localStorage fallback | localforage gracefully falls back to localStorage if IndexedDB unavailable. Trade-off: 5MB storage limit. |
| Mock server as plain Node.js | No framework dependency, easy to run. Trade-off: no TypeScript, no hot reload. |

### What Would Be Improved With More Time

1. **Server-side filtering/pagination** for large datasets (> 10,000 tasks)
2. **Optimistic updates** for task status changes
3. **Virtualized list** (react-window) for performance at scale
4. **E2E tests** with Playwright — test WS events and streaming
5. **Authentication** — JWT tokens, protected routes
6. **Error recovery** — retry logic for failed API calls with exponential backoff
7. **Accessibility** — ARIA live regions, keyboard navigation, focus management
8. **Metrics** — performance monitoring, error tracking (e.g., Sentry)
9. **Service Worker** for true offline support beyond IndexedDB caching
10. **WebSocket message queuing** — buffer events while reconnecting

### AI Assistance Disclosure

The following parts were drafted with AI assistance (Claude) and verified:

| Component | AI Role | Verification |
|-----------|---------|-------------|
| `normalize.ts` | Drafted logic | All 20+ test cases pass; manually reviewed edge cases |
| `taskSelectors.ts` | Drafted structure | Verified selector outputs against test suite |
| `useTaskFeed.ts` | Drafted WS pattern | Manually traced reconnect logic; tested with mock server |
| `useTaskSummary.ts` | Drafted streaming | Tested abort behavior and SSE parsing manually |
| CSS design system | Drafted tokens | Visual review in browser |
| `DECISIONS.md` | Drafted structure | All decisions reflect actual implementation choices |

All AI-generated code was reviewed for correctness, security implications, and adherence to the specified requirements before inclusion.
