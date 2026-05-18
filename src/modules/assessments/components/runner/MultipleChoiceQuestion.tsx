import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ChoiceOption, QuestionComponentProps } from "./types";

export function MultipleChoiceQuestion({ value, onChange, disabled, options }: QuestionComponentProps) {
  const opts = (Array.isArray(options) ? (options as ChoiceOption[]) : []).slice().sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const selected = new Set(value.option_ids ?? []);
  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange({ option_ids: Array.from(next) });
  }
  return (
    <div className="space-y-2">
      {opts.map((opt) => (
        <Label
          key={opt.id}
          htmlFor={`mc-${opt.id}`}
          className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer hover:bg-accent/40 transition-colors"
        >
          <Checkbox
            id={`mc-${opt.id}`}
            checked={selected.has(opt.id)}
            disabled={disabled}
            onCheckedChange={(c) => toggle(opt.id, c === true)}
            className="mt-0.5"
          />
          <span className="text-sm">{opt.label}</span>
        </Label>
      ))}
    </div>
  );
}
