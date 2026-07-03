import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import taskReducer, { loadCachedTasks } from '@/features/tasks/taskSlice';
import summaryReducer from '@/features/summary/summarySlice';
import { TaskFiltersBar } from '@/components/TaskFiltersBar';
import { TaskTable } from '@/components/TaskTable';
import { Task, TaskStatus, TaskType, PaginationMeta } from '@/types/task';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Default Task',
    type: TaskType.Image,
    status: TaskStatus.InProgress,
    annotationCount: 5,
    updatedAt: Date.now(),
    assignee: 'alice',
    description: '',
    ...overrides,
  };
}

function makeStore(tasks: Task[] = []) {
  const store = configureStore({
    reducer: { tasks: taskReducer, summary: summaryReducer },
  });
  if (tasks.length > 0) {
    const meta: PaginationMeta = {
      total: tasks.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    store.dispatch(loadCachedTasks({ tasks, meta }));
  }
  return store;
}

function renderWithStore(ui: React.ReactElement, tasks: Task[] = []) {
  const store = makeStore(tasks);
  const result = render(
    <Provider store={store}>{ui}</Provider>
  );
  return { ...result, store };
}

const sampleTasks: Task[] = [
  makeTask({ id: '1', title: 'Image Annotation Alpha', type: TaskType.Image, status: TaskStatus.Todo, assignee: 'alice', updatedAt: 3000 }),
  makeTask({ id: '2', title: 'Audio Transcription Beta', type: TaskType.Audio, status: TaskStatus.Done, assignee: 'bob', updatedAt: 2000 }),
  makeTask({ id: '3', title: 'Text Labeling Gamma', type: TaskType.Text, status: TaskStatus.Blocked, assignee: null, updatedAt: 1000 }),
];

describe('TaskFiltersBar', () => {
  test('renders search input', () => {
    renderWithStore(<TaskFiltersBar />, sampleTasks);
    expect(screen.getByRole('textbox', { name: /search tasks/i })).toBeInTheDocument();
  });

  test('renders status and type selects', () => {
    renderWithStore(<TaskFiltersBar />, sampleTasks);
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
  });

  test('renders reset button', () => {
    renderWithStore(<TaskFiltersBar />, sampleTasks);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});

describe('TaskTable filtering interactions', () => {
  test('shows all tasks initially', () => {
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );
    expect(screen.getByText('Image Annotation Alpha')).toBeInTheDocument();
    expect(screen.getByText('Audio Transcription Beta')).toBeInTheDocument();
    expect(screen.getByText('Text Labeling Gamma')).toBeInTheDocument();
  });

  test('filters tasks by search text', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    const searchInput = screen.getByRole('textbox', { name: /search tasks/i });
    await user.type(searchInput, 'Alpha');

    expect(screen.getByText('Image Annotation Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Audio Transcription Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Text Labeling Gamma')).not.toBeInTheDocument();
  });

  test('filters tasks by status', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    const statusSelect = screen.getByLabelText(/filter by status/i);
    await user.selectOptions(statusSelect, TaskStatus.Done);

    expect(screen.queryByText('Image Annotation Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Audio Transcription Beta')).toBeInTheDocument();
    expect(screen.queryByText('Text Labeling Gamma')).not.toBeInTheDocument();
  });

  test('filters tasks by type', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    const typeSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(typeSelect, TaskType.Text);

    expect(screen.queryByText('Image Annotation Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Audio Transcription Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Text Labeling Gamma')).toBeInTheDocument();
  });

  test('shows empty state when no tasks match', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    const searchInput = screen.getByRole('textbox', { name: /search tasks/i });
    await user.type(searchInput, 'xyznonexistent');

    expect(screen.getByText(/no tasks match/i)).toBeInTheDocument();
  });

  test('resets filters on reset button click', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    // Apply a filter
    const searchInput = screen.getByRole('textbox', { name: /search tasks/i });
    await user.type(searchInput, 'Alpha');
    expect(screen.queryByText('Audio Transcription Beta')).not.toBeInTheDocument();

    // Reset
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await user.click(resetBtn);

    // All tasks visible again
    expect(screen.getByText('Image Annotation Alpha')).toBeInTheDocument();
    expect(screen.getByText('Audio Transcription Beta')).toBeInTheDocument();
  });

  test('shows empty state when no tasks loaded', () => {
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      []
    );
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
  });

  test('shows unassigned label when assignee is null', () => {
    renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  test('task rows are clickable', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <><TaskFiltersBar /><TaskTable /></>,
      sampleTasks
    );

    const row = screen.getByText('Image Annotation Alpha').closest('tr');
    expect(row).not.toBeNull();
    await user.click(row!);

    expect(store.getState().tasks.selectedTaskId).toBe('1');
  });
});
