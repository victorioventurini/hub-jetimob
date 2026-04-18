import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function PremiseField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="premise" className="text-sm font-medium">
        Premissa <span className="text-destructive">*</span>
      </Label>
      <Textarea
        id="premise"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: Por que o NPS caiu no último trimestre?"
        rows={3}
        maxLength={1000}
        className="resize-none"
        required
      />
      <p className="text-xs text-muted-foreground">
        Descreva o que você quer entender ou decidir.
      </p>
    </div>
  );
}
