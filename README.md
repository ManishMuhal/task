# Annotation Activity Console

An internal dashboard for annotators to view tasks, monitor live updates through WebSocket events, and read AI-generated summaries streamed from the backend.

## Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the official mock backend (assessment appendix server)
cd mock-server && npm install && npm run mock &
cd ..

# 3. Start the Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Backend runs on [http://localhost:4000](http://localhost:4000).

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 18, TypeScript (strict) |
| State | Redux Toolkit + createEntityAdapter |
| Styling | TailwindCSS v4 + Vanilla CSS |
| Cache | localforage (IndexedDB) |
| Markdown | react-markdown + rehype-sanitize |
| Tests | Jest + React Testing Library |
| Live data | WebSocket (auto-reconnect) |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & layout
│   ├── layout.tsx          # Root layout with Redux provider
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Dark theme design system
├── components/
│   ├── ErrorBoundary.tsx   # Class-based error boundary
│   ├── ReduxProvider.tsx   # Client-side Redux provider
│   ├── StatusBar.tsx       # WS/stale/streaming indicators
│   ├── TaskDetailPanel.tsx # Detail view + streaming AI summary
│   ├── TaskFiltersBar.tsx  # Search, filters, sort controls
│   ├── TaskTable.tsx       # Sortable table with pagination
│   └── TaskTicker.tsx      # Live activity ticker (bug-fixed)
├── features/
│   ├── tasks/
│   │   ├── taskSlice.ts    # Entity adapter, reducers
│   │   ├── taskSelectors.ts # Memoized selectors
│   │   └── taskThunks.ts   # Async data fetching
│   └── summary/
│       ├── summarySlice.ts  # Streaming state
│       └── summarySelectors.ts
├── hooks/
│   ├── useTaskFeed.ts      # WebSocket with exponential backoff
│   ├── useTaskSummary.ts   # AbortController streaming
│   └── useTaskLoader.ts    # Stale-while-revalidate
├── lib/
│   └── cache.ts            # localforage IndexedDB wrappers
├── services/
│   └── taskApi.ts          # REST API client
├── store/
│   ├── index.ts            # Store configuration
│   └── hooks.ts            # Typed useAppDispatch/useAppSelector
├── types/
│   └── task.ts             # Domain models, enums, WS events
├── utils/
│   ├── normalize.ts        # Messy data normalization
│   └── format.ts           # Date, status, type formatting
├── tests/
│   ├── setup.ts            # jest-dom setup
│   ├── normalize.test.ts   # Normalization unit tests
│   ├── selectors.test.ts   # Redux selector tests
│   └── filtering.test.tsx  # RTL integration tests
└── __mocks__/
    └── localforage.ts      # In-memory IndexedDB mock for Jest
```

## Features

### Task List
- **Search** by title or assignee
- **Filter** by status (todo / in_progress / done / QA / blocked)
- **Filter** by type (image / audio / text / unknown)
- **Sort** by updated date or title (asc/desc)
- **Pagination** with ellipsis for large datasets

### Task Detail
- Full metadata: type, status, assignee, annotation count, updated time
- **Streaming AI summary** with live text appearance
- XSS-safe markdown via `rehype-sanitize`

### Live Updates
- WebSocket feed at `ws://localhost:4000/ws`
- Handles: `task.updated`, `task.assigned`, `annotation.created`
- Exponential backoff reconnect (3s → 30s max)
- Unknown task IDs handled gracefully

### IndexedDB Caching
- Task list cached with 5-minute TTL
- AI summaries cached indefinitely
- Stale data shown with indicator while refreshing
- Non-blocking: never delays UI

### Security
- All AI markdown sanitized with `rehype-sanitize`
- `<script>`, `<iframe>`, `<form>` tags stripped
- Event handler attributes (`onclick`, etc.) removed

## Environment Variables

Create `.env.local` to override defaults:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
```

## Mock Backend

`mock-server.js` simulates the production backend with intentionally messy data:
- Mixed status casings: `in_progress`, `InProgress`, `BLOCKED`
- Mixed `annotationCount` types: numbers and strings
- Mixed `updatedAt` formats: ISO strings and epoch timestamps (sec & ms)
- `assignee: null` for unassigned tasks
- Unknown `type` values like `video`
- WebSocket events broadcast every 4 seconds
# task
