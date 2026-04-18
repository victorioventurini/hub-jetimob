import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function AdditionalContextField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="add-ctx" className="text-sm font-medium">
        Contexto adicional (opcional)
      </Label>
      <Textarea
        id="add-ctx"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Informações relevantes que não estão nos módulos…"
        rows={3}
        maxLength={2000}
        className="resize-none"
      />
    </div>
  );
}
