import { Input } from "@/components/ui/input";
import type { QuestionComponentProps } from "./types";

export function ShortTextQuestion({ value, onChange, disabled, onTelemetry }: QuestionComponentProps) {
  return (
    <Input
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      value={value.text ?? ""}
      onChange={(e) => onChange({ text: e.target.value })}
      onPaste={(e) => {
        e.preventDefault();
        onTelemetry?.({ paste: true });
      }}
      onCopy={(e) => {
        e.preventDefault();
        onTelemetry?.({ copy: true });
      }}
      onCut={(e) => {
        e.preventDefault();
        onTelemetry?.({ copy: true });
      }}
      onContextMenu={(e) => e.preventDefault()}
      placeholder="Digite sua resposta…"
    />
  );
}
