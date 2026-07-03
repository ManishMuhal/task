import { TaskStatus, TaskType } from '@/types/task';

export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochMs));
}

export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    [TaskStatus.Todo]: 'To Do',
    [TaskStatus.InProgress]: 'In Progress',
    [TaskStatus.Done]: 'Done',
    [TaskStatus.QA]: 'QA',
    [TaskStatus.Blocked]: 'Blocked',
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.Todo]: 'status-todo',
    [TaskStatus.InProgress]: 'status-in-progress',
    [TaskStatus.Done]: 'status-done',
    [TaskStatus.QA]: 'status-qa',
    [TaskStatus.Blocked]: 'status-blocked',
  };
  return colors[status] ?? 'status-todo';
}

export function getTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    [TaskType.Image]: 'Image',
    [TaskType.Audio]: 'Audio',
    [TaskType.Text]: 'Text',
    [TaskType.Unknown]: 'Unknown',
  };
  return labels[type] ?? type;
}

export function getTypeIcon(type: TaskType): string {
  const icons: Record<TaskType, string> = {
    [TaskType.Image]: '🖼️',
    [TaskType.Audio]: '🎵',
    [TaskType.Text]: '📝',
    [TaskType.Unknown]: '❓',
  };
  return icons[type] ?? '❓';
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural ?? singular + 's'}`;
}
