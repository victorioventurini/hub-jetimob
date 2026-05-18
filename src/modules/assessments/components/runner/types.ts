/**
 * Tipos compartilhados pelos componentes de questão do runner.
 */
export type QuestionType = "short_text" | "long_text" | "single_choice" | "multiple_choice" | "scale";

export type ChoiceOption = { id: string; label: string; order?: number };
export type ScaleConfig = {
  min: number;
  max: number;
  step?: number;
  min_label?: string | null;
  max_label?: string | null;
};

export type AnswerValue = {
  text?: string;
  option_ids?: string[];
  scale_value?: number;
};

export type TelemetryEmit = (evt: {
  paste?: boolean;
  copy?: boolean;
  interactionDelta?: number;
}) => void;

export interface QuestionComponentProps {
  value: AnswerValue;
  onChange: (next: AnswerValue) => void;
  disabled?: boolean;
  options: unknown;
  onTelemetry?: TelemetryEmit;
}

export function isAnswered(type: QuestionType, value: AnswerValue): boolean {
  switch (type) {
    case "short_text":
    case "long_text":
      return !!(value.text ?? "").trim();
    case "single_choice":
    case "multiple_choice":
      return (value.option_ids?.length ?? 0) > 0;
    case "scale":
      return value.scale_value !== undefined && value.scale_value !== null;
  }
}
