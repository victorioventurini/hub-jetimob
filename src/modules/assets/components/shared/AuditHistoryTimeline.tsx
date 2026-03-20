/**
 * AuditHistoryTimeline — Reusable timeline component for audit log entries.
 * Displays human-readable diffs of changed fields.
 */

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Plus, Pencil, Trash2 } from "lucide-react";
import type { AuditEntry } from "../../hooks/useAuditHistory";

// ── Types ─────────────────────────────────────────────

interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

interface AuditHistoryTimelineProps {
  entries: AuditEntry[] | undefined;
  isLoading: boolean;
  /** Map of DB field names → human-readable labels */
  fieldLabels: Record<string, string>;
  /** Fields to exclude from the diff */
  ignoredFields?: Set<string>;
  /** Map of field → { value → label } for enum formatting */
  valueLabels?: Record<string, Record<string, string>>;
  /** Max height for the scroll area */
  maxHeight?: string;
}

// ── Default ignored fields ────────────────────────────

const DEFAULT_IGNORED_FIELDS = new Set([
  "id", "bu_id", "created_at", "updated_at", "deleted_at",
]);

// ── Action config ─────────────────────────────────────

const ACTION_CONFIG: Record<string, { icon: typeof History; label: string; color: string }> = {
  create: { icon: Plus, label: "Cadastro", color: "text-green-600" },
  update: { icon: Pencil, label: "Alteração", color: "text-blue-600" },
  delete: { icon: Trash2, label: "Exclusão", color: "text-destructive" },
};

// ── Helpers ───────────────────────────────────────────

function formatValue(
  field: string,
  value: unknown,
  valueLabels?: Record<string, Record<string, string>>
): string {
  if (value === null || value === undefined || value === "") return "—";
  const str = String(value);
  return valueLabels?.[field]?.[str] ?? str;
}

function computeChanges(
  entry: AuditEntry,
  fieldLabels: Record<string, string>,
  ignoredFields: Set<string>,
  valueLabels?: Record<string, Record<string, string>>
): FieldChange[] {
  if (entry.action !== "update" || !entry.old_values || !entry.new_values) return [];

  const changes: FieldChange[] = [];
  const allKeys = new Set([
    ...Object.keys(entry.old_values),
    ...Object.keys(entry.new_values),
  ]);

  for (const key of allKeys) {
    if (ignoredFields.has(key)) continue;
    const oldVal = entry.old_values[key];
    const newVal = entry.new_values[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        label: fieldLabels[key] ?? key,
        from: formatValue(key, oldVal, valueLabels),
        to: formatValue(key, newVal, valueLabels),
      });
    }
  }
  return changes;
}

// ── Component ─────────────────────────────────────────

export function AuditHistoryTimeline({
  entries,
  isLoading,
  fieldLabels,
  ignoredFields,
  valueLabels,
  maxHeight = "320px",
}: AuditHistoryTimelineProps) {
  const mergedIgnored = ignoredFields
    ? new Set([...DEFAULT_IGNORED_FIELDS, ...ignoredFields])
    : DEFAULT_IGNORED_FIELDS;

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
    <ScrollArea className={`pr-3`} style={{ height: maxHeight }}>
      <div className="space-y-4">
        {entries.map((entry) => {
          const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
          const Icon = config.icon;
          const changes = computeChanges(entry, fieldLabels, mergedIgnored, valueLabels);

          return (
            <div key={entry.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={entry.profile_photo_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(entry.profile_display_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

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
                  <p className="text-xs text-muted-foreground mt-1">Registro cadastrado</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
