import type { OkrStatus } from "../../types";

export interface TeamObjectiveFormData {
  id?: string;
  title: string;
  description?: string | null;
  team_id: string;
  status: OkrStatus;
  is_shared?: boolean;
  responsibility_model?: string | null;
  org_objective_id?: string | null;
}

export interface TeamObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: TeamObjectiveFormData | null;
  teams?: Array<{ id: string; name: string; parent_team_id?: string | null }>;
  orgObjectives?: Array<{ id: string; title: string }>;
}

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
] as const;

export const RESPONSIBILITY_MODEL_OPTIONS = [
  { value: 'collaborative', label: 'Colaborativo (todos co-responsáveis)' },
  { value: 'primary_led', label: 'Líder primário + contribuidores' },
] as const;
