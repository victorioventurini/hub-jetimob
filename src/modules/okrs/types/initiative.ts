// Initiative Types

export type InitiativeStatus = 'planned' | 'in_progress' | 'blocked' | 'completed';
export type InitiativePriority = 'low' | 'medium' | 'high';

export interface Initiative {
  id: string;
  name: string;
  description: string | null;
  kr_id: string;
  bu_id: string | null;
  owner_user_id: string;
  status: InitiativeStatus;
  priority: InitiativePriority | null;
  start_date: string | null;
  expected_end_date: string | null;
  progress: number | null;
  contributors: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  owner?: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
  };
}

export interface CreateInitiativeInput {
  name: string;
  description?: string;
  kr_id: string;
  bu_id?: string;
  owner_user_id: string;
  status?: InitiativeStatus;
  priority?: InitiativePriority;
  start_date?: string;
  expected_end_date?: string;
  progress?: number;
  contributors?: string[];
  notes?: string;
}

export interface UpdateInitiativeInput {
  id: string;
  name?: string;
  description?: string;
  owner_user_id?: string;
  status?: InitiativeStatus;
  priority?: InitiativePriority;
  start_date?: string;
  expected_end_date?: string | null;
  progress?: number;
  contributors?: string[];
  notes?: string | null;
}

// Helper functions
export function getInitiativeStatusLabel(status: InitiativeStatus): string {
  const labels: Record<InitiativeStatus, string> = {
    planned: 'Planejada',
    in_progress: 'Em progresso',
    blocked: 'Bloqueada',
    completed: 'Concluída',
  };
  return labels[status];
}

export function getInitiativeStatusColor(status: InitiativeStatus): string {
  const colors: Record<InitiativeStatus, string> = {
    planned: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  return colors[status];
}

export function getInitiativePriorityLabel(priority: InitiativePriority | null): string {
  if (!priority) return 'Média';
  const labels: Record<InitiativePriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  };
  return labels[priority];
}

export function getInitiativePriorityColor(priority: InitiativePriority | null): string {
  if (!priority) return 'text-muted-foreground';
  const colors: Record<InitiativePriority, string> = {
    low: 'text-muted-foreground',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-red-600 dark:text-red-400',
  };
  return colors[priority];
}
