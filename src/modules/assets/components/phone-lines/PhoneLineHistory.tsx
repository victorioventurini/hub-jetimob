/**
 * PhoneLineHistory — Timeline of audit log entries for a phone line.
 * Displays human-readable diffs of changed fields.
 */

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Plus, Pencil, Trash2 } from "lucide-react";
import { usePhoneLineHistory, type PhoneLineAuditEntry } from "../../hooks/usePhoneLineHistory";

// ── Field labels ──────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  phone_number: "Número",
  carrier: "Operadora",
  plan_type: "Plano",
  status: "Status",
  current_user_id: "Usuário atual",
  responsible_user_id: "Responsável",
  linked_asset_id: "Asset vinculado",
  responsible_team_id: "Time responsável",
  notes: "Observações",
};

const IGNORED_FIELDS = new Set([
  "id", "bu_id", "created_at", "updated_at", "deleted_at",
]);

const VALUE_LABELS: Record<string, Record<string, string>> = {
  plan_type: { prepaid: "Pré-pago", postpaid: "Pós-pago" },
  status: { available: "Disponível", loaned: "Emprestado" },
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const str = String(value);
  return VALUE_LABELS[field]?.[str] ?? str;
}

// ── Diff logic ────────────────────────────────────────

interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

function computeChanges(entry: PhoneLineAuditEntry): FieldChange[] {
  if (entry.action !== "update" || !entry.old_values || !entry.new_values) return [];

  const changes: FieldChange[] = [];
  const allKeys = new Set([
    ...Object.keys(entry.old_values),
    ...Object.keys(entry.new_values),
  ]);

  for (const key of allKeys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const oldVal = entry.old_values[key];
    const newVal = entry.new_values[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        label: FIELD_LABELS[key] ?? key,
        from: formatValue(key, oldVal),
        to: formatValue(key, newVal),
      });
    }
  }
  return changes;
}

// ── Action config ─────────────────────────────────────

const ACTION_CONFIG: Record<string, { icon: typeof History; label: string; color: string }> = {
  create: { icon: Plus, label: "Cadastro", color: "text-green-600" },
  update: { icon: Pencil, label: "Alteração", color: "text-blue-600" },
  delete: { icon: Trash2, label: "Exclusão", color: "text-destructive" },
};

// ── Component ─────────────────────────────────────────

interface PhoneLineHistoryProps {
  phoneLineId: string;
}

export function PhoneLineHistory({ phoneLineId }: PhoneLineHistoryProps) {
  const { data: entries, isLoading } = usePhoneLineHistory(phoneLineId);

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhum histórico registrado</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[320px] pr-3">
      <div className="space-y-4">
        {entries.map((entry) => {
          const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
          const Icon = config.icon;
          const changes = computeChanges(entry);

          return (
            <div key={entry.id} className="flex gap-3">
              {/* Avatar */}
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={entry.profile_photo_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(entry.profile_display_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
                  <span className="text-sm font-medium">
                    {entry.profile_display_name ?? "Sistema"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — {config.label}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(entry.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </p>

                {/* Field changes */}
                {changes.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {changes.map((c) => (
                      <div key={c.field} className="text-xs rounded bg-muted/50 px-2 py-1">
                        <span className="font-medium">{c.label}:</span>{" "}
                        <span className="line-through text-muted-foreground">{c.from}</span>
                        {" → "}
                        <span>{c.to}</span>
                      </div>
                    ))}
                  </div>
                )}

                {entry.action === "create" && (
                  <p className="text-xs text-muted-foreground mt-1">Linha cadastrada</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
