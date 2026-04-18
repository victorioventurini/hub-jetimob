/**
 * AdditionalContextField — contexto livre que entra ANTES dos dados no prompt
 */
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function AdditionalContextField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ctx" className="text-sm font-medium">
        Contexto adicional <span className="text-muted-foreground">(opcional)</span>
      </Label>
      <Textarea
        id="ctx"
        placeholder="Ex.: Estamos em transição de modelo de comissão. Considere que o time de Customer Success ficou parcialmente alocado em projetos."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={2000}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Esse contexto é injetado no início do prompt e tem prioridade interpretativa.
      </p>
    </div>
  );
}
