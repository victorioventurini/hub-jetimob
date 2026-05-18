import { ShortTextQuestion } from "./ShortTextQuestion";
import { LongTextQuestion } from "./LongTextQuestion";
import { SingleChoiceQuestion } from "./SingleChoiceQuestion";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { ScaleQuestion } from "./ScaleQuestion";
import type { QuestionComponentProps, QuestionType } from "./types";

export function QuestionRenderer(props: QuestionComponentProps & { type: QuestionType }) {
  const { type, ...rest } = props;
  switch (type) {
    case "short_text":
      return <ShortTextQuestion {...rest} />;
    case "long_text":
      return <LongTextQuestion {...rest} />;
    case "single_choice":
      return <SingleChoiceQuestion {...rest} />;
    case "multiple_choice":
      return <MultipleChoiceQuestion {...rest} />;
    case "scale":
      return <ScaleQuestion {...rest} />;
    default:
      return null;
  }
}
