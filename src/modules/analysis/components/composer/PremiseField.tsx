/**
 * PremiseField — pergunta principal
 */
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function PremiseField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="premise" className="text-sm font-medium">
        O que você quer entender?
      </Label>
      <Textarea
        id="premise"
        placeholder="Ex.: Como nosso MRR evoluiu vs. churn no último trimestre? Quais times entregaram OKRs com mais consistência?"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Seja específico. Quanto melhor a premissa, melhor o resultado.
      </p>
    </div>
  );
}
