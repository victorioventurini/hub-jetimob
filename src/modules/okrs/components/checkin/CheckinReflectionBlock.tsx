import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AtSign } from "lucide-react";
import { InternalMentionInput } from "@/components/mentions";

interface CheckinReflectionBlockProps {
  reflection: string;
  nextStep: string;
  onReflectionChange: (value: string, mentions: string[]) => void;
  onNextStepChange: (value: string) => void;
  /**
   * Habilita @menções no campo de reflexão.
   * Default: true (modal `CheckinDialog` em /okrs).
   * No Check-in Individual (wizard colaborador) DEVE ser `false` —
   * conforme TCR, `okr_checkins.comments` é texto puro nesse fluxo.
   */
  enableMentions?: boolean;
}

export function CheckinReflectionBlock({
  reflection,
  nextStep,
  onReflectionChange,
  onNextStepChange,
  enableMentions = true,
}: CheckinReflectionBlockProps) {
  return (
    <>
      {/* BLOCO 4 — REFLEXÃO (OBRIGATÓRIO) */}
      <div className="space-y-2">
        <Label htmlFor="reflection" className="text-sm font-semibold flex items-center gap-2">
          O que avançou e o que merece atenção? *
          {enableMentions && (
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Use @ para mencionar pessoas
            </span>
          )}
        </Label>
        {enableMentions ? (
          <InternalMentionInput
            id="reflection"
            placeholder="Avançamos em X, mas estamos travados em Y. Use @nome para mencionar colegas."
            value={reflection}
            onChange={onReflectionChange}
            rows={3}
            required
          />
        ) : (
          <Textarea
            id="reflection"
            placeholder="Avançamos em X, mas estamos travados em Y."
            value={reflection}
            onChange={(e) => onReflectionChange(e.target.value, [])}
            rows={3}
            required
            className="resize-none"
          />
        )}
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
