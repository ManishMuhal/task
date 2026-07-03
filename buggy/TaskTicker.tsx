// buggy/TaskTicker.tsx
// This is the ORIGINAL buggy file as provided in the assessment.
// The FIXED version lives at src/components/TaskTicker.tsx
// See DECISIONS.md for root-cause analysis of each bug.

import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // (A) keep a running clock for "x seconds ago"
  // BUG 1: stale closure — tick is captured at mount, never updates
  useEffect(() => {
    const id = setInterval(() => {
      setTick(tick + 1); // ❌ stale closure: always sets to 0 + 1 = 1
    }, 1000);
    return () => clearInterval(id);
  }, []); // ❌ empty deps: tick never re-captured

  // (B) refetch whenever selection changes
  // BUG 5: no null guard — fetches /api/tasks/null on mount
  useEffect(() => {
    fetch(`${apiBase}/api/tasks/${selectedId}`) // ❌ fires when selectedId = null
      .then((r) => r.json())
      .then((t) => {
        setTasks((prev) => {
          prev.push(t); // ❌ BUG 2: mutates state array directly
          return prev;  // ❌ same reference → React skips re-render
        });
      });
  }, [selectedId]);

  // (C) newest first
  // BUG 3: sort() mutates the original tasks array in place
  const sorted = tasks.sort((a, b) => b.updatedAt - a.updatedAt); // ❌ mutates state

  return (
    <ul>
      {sorted.map((t, i) => (
        // BUG 4: key={i} — array index is unstable, breaks reconciliation on reorder
        <li key={i} onClick={() => setSelectedId(t.id)}>
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000)}s ago)
          {/* BUG 6: tick state is never used in the JSX expression — 
              the "x seconds ago" value won't re-compute on each tick
              because tick doesn't appear in the rendered output */}
        </li>
      ))}
    </ul>
  );
}
