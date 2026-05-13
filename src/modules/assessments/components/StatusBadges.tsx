/**
 * Badges canônicos do módulo Assessments com labels PT-BR.
 * Centraliza tradução de enums de status para o usuário final.
 */
import { memo } from "react";
import { Badge } from "@/components/ui/badge";

type Variant = React.ComponentProps<typeof Badge>["variant"];

const ASSESSMENT_LABELS: Record<string, { label: string; variant: Variant }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativa", variant: "default" },
  archived: { label: "Arquivada", variant: "outline" },
};

const FORM_LABELS: Record<string, { label: string; variant: Variant }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  archived: { label: "Arquivado", variant: "outline" },
};

const INVITE_LABELS: Record<string, { label: string; variant: Variant }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em andamento", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default" },
  revoked: { label: "Revogado", variant: "destructive" },
  expired: { label: "Expirado", variant: "outline" },
};

const RUN_LABELS: Record<string, { label: string; variant: Variant }> = {
  in_progress: { label: "Em andamento", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default" },
  abandoned: { label: "Abandonado", variant: "outline" },
};

function makeBadge(map: Record<string, { label: string; variant: Variant }>) {
  return memo(function StatusBadge({ status }: { status?: string | null }) {
    const entry = (status && map[status]) || { label: status ?? "—", variant: "secondary" as Variant };
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
  });
}

export const AssessmentStatusBadge = makeBadge(ASSESSMENT_LABELS);
export const FormStatusBadge = makeBadge(FORM_LABELS);
export const InviteStatusBadge = makeBadge(INVITE_LABELS);
export const RunStatusBadge = makeBadge(RUN_LABELS);
