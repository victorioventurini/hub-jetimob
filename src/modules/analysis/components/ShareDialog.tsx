/**
 * ShareDialog — compartilhar análise com membros da BU
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BuUserMultiSelect } from "@/components/selects";
import { useAnalysisShare } from "../hooks/useAnalysisShare";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
}

export function ShareDialog({ open, onOpenChange, reportId }: Props) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const share = useAnalysisShare();

  const submit = async () => {
    if (!recipients.length) return;
    await share.mutateAsync({
      report_id: reportId,
      recipient_profile_ids: recipients,
      message: message.trim() || undefined,
    });
    setRecipients([]);
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar análise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <BuUserMultiSelect value={recipients} onValueChange={setRecipients} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">Mensagem (opcional)</Label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Adicione um contexto…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!recipients.length || share.isPending}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
