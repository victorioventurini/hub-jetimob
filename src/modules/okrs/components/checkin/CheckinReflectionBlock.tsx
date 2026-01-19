import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign } from "lucide-react";
import { InternalMentionInput } from "@/components/mentions";

interface CheckinReflectionBlockProps {
  reflection: string;
  nextStep: string;
  onReflectionChange: (value: string, mentions: string[]) => void;
  onNextStepChange: (value: string) => void;
}

export function CheckinReflectionBlock({
  reflection,
  nextStep,
  onReflectionChange,
  onNextStepChange,
}: CheckinReflectionBlockProps) {
  return (
    <>
      {/* BLOCO 4 — REFLEXÃO (OBRIGATÓRIO) */}
      <div className="space-y-2">
        <Label htmlFor="reflection" className="text-sm font-semibold flex items-center gap-2">
          O que avançou e o que merece atenção? *
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            <AtSign className="w-3 h-3" />
            Use @ para mencionar pessoas
          </span>
        </Label>
        <InternalMentionInput
          id="reflection"
          placeholder="Avançamos em X, mas estamos travados em Y. Use @nome para mencionar colegas."
          value={reflection}
          onChange={onReflectionChange}
          rows={3}
          required
        />
        <p className="text-xs text-muted-foreground">
          Foco em fatos, não justificativas longas. 1 a 3 frases.
        </p>
      </div>

      {/* BLOCO 5 — PRÓXIMO PASSO (OPCIONAL) */}
      <div className="space-y-2">
        <Label htmlFor="nextStep" className="text-sm font-medium text-muted-foreground">
          Próximo passo concreto (recomendado)
        </Label>
        <Input
          id="nextStep"
          placeholder="Ex: Reunir com time de vendas para alinhar..."
          value={nextStep}
          onChange={(e) => onNextStepChange(e.target.value)}
        />
      </div>
    </>
  );
}
