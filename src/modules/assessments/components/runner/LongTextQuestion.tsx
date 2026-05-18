import { LockedTextarea } from "@/modules/assessments/components/LockedTextarea";
import type { QuestionComponentProps } from "./types";

export function LongTextQuestion({ value, onChange, disabled, onTelemetry }: QuestionComponentProps) {
  return (
    <LockedTextarea
      rows={14}
      className="min-h-[320px] text-base leading-relaxed"
      placeholder="Digite sua resposta…"
      disabled={disabled}
      value={value.text ?? ""}
      onChange={(e) => onChange({ text: e.target.value })}
      onPasteAttempt={() => onTelemetry?.({ paste: true })}
      onCopyAttempt={() => onTelemetry?.({ copy: true })}
    />
  );
}
