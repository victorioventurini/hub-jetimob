import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { ChoiceOption, QuestionComponentProps } from "./types";

export function SingleChoiceQuestion({ value, onChange, disabled, options }: QuestionComponentProps) {
  const opts = (Array.isArray(options) ? (options as ChoiceOption[]) : []).slice().sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const selected = value.option_ids?.[0] ?? "";
  return (
    <RadioGroup
      value={selected}
      onValueChange={(v) => onChange({ option_ids: [v] })}
      disabled={disabled}
      className="space-y-2"
    >
      {opts.map((opt) => (
        <Label
          key={opt.id}
          htmlFor={`opt-${opt.id}`}
          className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer hover:bg-accent/40 transition-colors"
        >
          <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="mt-0.5" />
          <span className="text-sm">{opt.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}
