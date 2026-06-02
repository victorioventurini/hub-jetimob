/**
 * Project Module Types
 *
 * Identity convention: owner_id = profiles.id (NEVER auth.users.id)
 */

// ── Enums (match DB enums) ──

export type ProjectStatus = 'planned' | 'in_progress' | 'paused' | 'done' | 'cancelled';
export type MilestoneStatus = 'todo' | 'in_progress' | 'done';
export type ProjectImpact = 'high' | 'medium' | 'low';
export type ProjectHealth = 'on_track' | 'at_risk' | 'late';

// ── Core entities ──

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  external_url: string | null;
  bu_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectOwner {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

export type KrLinkKind = 'team' | 'org';

export interface ProjectWithRelations extends Project {
  owner: ProjectOwner | null;
  teams: Array<{ team_id: string; team_name: string }>;
  krs: Array<{
    key_result_id: string;
    kr_title: string;
    impact: ProjectImpact;
    kind: KrLinkKind;
    /** Nome do time dono do objetivo (apenas Team KRs; null para Org). */
    team_name: string | null;
  }>;
  milestones: ProjectMilestone[];
  health: ProjectHealth;
  milestones_total: number;
  milestones_done: number;
  completion_pct: number;
  /** Verdadeiro quando o projeto está arquivado (deleted_at != null). */
  is_archived?: boolean;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  owner_id: string;
  status: MilestoneStatus;
  start_date: string;
  due_date: string | null;
  notes: string | null;
  sort_order: number;
  bu_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectKrLink {
  project_id: string;
  key_result_id: string;
  impact: ProjectImpact;
  kr_title?: string;
  objective_title?: string;
}

// ── Lightweight type for wizard integration ──

export interface ProjectForWizard {
  id: string;
  name: string;
  status: ProjectStatus;
  health: ProjectHealth;
  due_date: string | null;
  external_url: string | null;
  milestones_total: number;
  milestones_done: number;
  completion_pct: number;
  owner_id: string | null;
  owner_name: string | null;
  owner_photo_url: string | null;
  teams?: Array<{ team_id: string; team_name: string }>;
  milestones?: Array<{
    id: string;
    name: string;
    status: MilestoneStatus;
    start_date: string;
    due_date: string | null;
    owner_id: string;
    owner_name: string | null;
    owner_photo_url: string | null;
    notes: string | null;
  }>;
}

// ── Gantt ──

export interface GanttItem {
  id: string;
  type: 'project' | 'milestone';
  name: string;
  start_date: string;
  due_date: string;
  status: ProjectStatus | MilestoneStatus;
  health?: ProjectHealth;
  owner_id?: string;
  parent_id?: string;
  dependencies?: string[];
  notes?: string | null;
  completion_pct?: number;
}

// ── Filters ──

export type ProjectArchivedState = 'active' | 'archived' | 'all';

export interface ProjectFilters {
  status?: ProjectStatus | 'all';
  health?: ProjectHealth | 'all';
  owner_id?: string;
  team_id?: string;
  linked_to_kr?: boolean | null;
  search?: string;
  /** Filtro de visualização por estado de arquivamento. Default: 'active'. */
  archived_state?: ProjectArchivedState;
}

// ── Mutation inputs ──

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  owner_id: string;
  status?: ProjectStatus;
  start_date: string;
  due_date: string;
  external_url?: string | null;
  bu_id: string;
  team_ids?: string[];
  kr_links?: Array<{ key_result_id: string; impact: ProjectImpact }>;
}

export interface UpdateProjectInput {
  id: string;
  /**
   * BU do registro (project.bu_id). OBRIGATÓRIO.
   * Usado na cláusula .eq('bu_id', ...) para garantir target específico
   * sem depender do BuContext (que pode estar stale ou divergente).
   */
  bu_id: string;
  name?: string;
  description?: string | null;
  owner_id?: string;
  status?: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
  external_url?: string | null;
  team_ids?: string[];
}

export interface SoftDeleteProjectInput {
  id: string;
  /** BU do registro (project.bu_id). OBRIGATÓRIO. Ver UpdateProjectInput. */
  bu_id: string;
}

export interface CreateMilestoneInput {
  project_id: string;
  name: string;
  /** Obrigatório — referencia profiles.id (NUNCA auth.users.id). Ver mem://features/projects/holistic-module-architecture-v2 */
  owner_id: string;
  status?: MilestoneStatus;
  start_date: string;
  due_date?: string | null;
  notes?: string | null;
  sort_order?: number;
  bu_id: string;
}

export interface UpdateMilestoneInput {
  id: string;
  name?: string;
  /** Não pode ser limpo (NOT NULL no DB) — só trocado. */
  owner_id?: string;
  status?: MilestoneStatus;
  start_date?: string;
  due_date?: string | null;
  notes?: string | null;
  sort_order?: number;
}