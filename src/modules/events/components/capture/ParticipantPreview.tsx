/**
 * ParticipantPreview — Preview participant data after code lookup
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Participant } from "../../types";

export function ParticipantPreview({ participant }: { participant: Participant }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{participant.fullName}</h3>
          <Badge variant="secondary" className="text-[10px]">{participant.code}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div><span className="font-medium">Email:</span> {participant.email}</div>
          <div><span className="font-medium">Telefone:</span> {participant.phone}</div>
          <div><span className="font-medium">Cidade:</span> {participant.city}/{participant.uf}</div>
          <div><span className="font-medium">Cargo:</span> {participant.jobTitle}</div>
          <div><span className="font-medium">Empresa:</span> {participant.companyName}</div>
          <div><span className="font-medium">Tipo:</span> {participant.companyType}</div>
          <div><span className="font-medium">Atuação:</span> {participant.operationArea}</div>
        </div>
      </CardContent>
    </Card>
  );
}
