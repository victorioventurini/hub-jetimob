/**
 * ShareDialog — compartilhar análise com pessoas da BU
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";
import { useAnalysisShare } from "../hooks/useAnalysisShare";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
}

export function ShareDialog({ open, onOpenChange, reportId }: Props) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const share = useAnalysisShare();

  const handleSubmit = async () => {
    await share.mutateAsync({ reportId, recipientProfileIds: recipients });
    setRecipients([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar análise</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Selecione com quem deseja compartilhar. Os destinatários receberão notificação no
            sistema e por e-mail.
          </p>
          <BuUserMultiSelect
            value={recipients}
            onValueChange={setRecipients}
            placeholder="Buscar pessoas da BU…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={recipients.length === 0 || share.isPending}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
