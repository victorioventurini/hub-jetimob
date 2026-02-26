/**
 * CaptureForm — Public capture form for opportunities
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CheckCircle2 } from "lucide-react";
import { PARTICIPANTS_MOCK } from "../../mocks/participants";
import { EVENTS_MOCK } from "../../mocks/events";
import { SPONSOR_MOCK } from "../../mocks/sponsor";
import { useEventsContext } from "../../context/EventsContext";
import { ParticipantPreview } from "./ParticipantPreview";
import type { Participant } from "../../types";

const ALL_AREAS = SPONSOR_MOCK.areasOfOperation.map((a) => a.subcategory);

interface CaptureFormProps {
  eventCode: string;
}

export function CaptureForm({ eventCode }: CaptureFormProps) {
  const { addOpportunity } = useEventsContext();
  const [participantCode, setParticipantCode] = useState("");
  const [foundParticipant, setFoundParticipant] = useState<Participant | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const event = EVENTS_MOCK.find((e) => e.code === eventCode);

  const handleSearch = () => {
    setError("");
    const p = PARTICIPANTS_MOCK.find((p) => p.code === participantCode.trim().toUpperCase());
    if (p) {
      setFoundParticipant(p);
    } else {
      setError("Participante não encontrado. Verifique o código.");
      setFoundParticipant(null);
    }
  };

  const handleSubmit = () => {
    if (!foundParticipant || !event || selectedAreas.length === 0) return;

    addOpportunity({
      participantId: foundParticipant.id,
      eventId: event.id,
      sponsorId: SPONSOR_MOCK.id,
      areasOfInterest: selectedAreas,
      observations,
      capturedBy: "Equipe Porto Seguro",
      fitScore: Math.round(50 + Math.random() * 50),
    });

    setSubmitted(true);
  };

  const handleReset = () => {
    setParticipantCode("");
    setFoundParticipant(null);
    setSelectedAreas([]);
    setObservations("");
    setSubmitted(false);
    setError("");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Evento não encontrado: <strong>{eventCode}</strong></p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Oportunidade Registrada!</h2>
            <p className="text-sm text-muted-foreground">
              O contato de <strong>{foundParticipant?.fullName}</strong> foi capturado com sucesso.
            </p>
            <Button onClick={handleReset} className="w-full">Nova Captura</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-white border border-border mx-auto flex items-center justify-center p-1.5">
            <img src={SPONSOR_MOCK.logoUrl} alt={SPONSOR_MOCK.name} className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{SPONSOR_MOCK.name}</h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>

        {/* Search participant */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Identificar Participante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Código do participante (ex: P1001)"
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="text-sm"
              />
              <Button size="sm" onClick={handleSearch} className="gap-1.5 shrink-0">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Participant preview + form */}
        {foundParticipant && (
          <>
            <ParticipantPreview participant={foundParticipant} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Registrar Oportunidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Áreas de Atuação (selecione uma ou mais)</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                    {ALL_AREAS.map((area) => (
                      <label key={area} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded px-2 py-1.5">
                        <Checkbox
                          checked={selectedAreas.includes(area)}
                          onCheckedChange={(checked) => {
                            setSelectedAreas((prev) =>
                              checked ? [...prev, area] : prev.filter((a) => a !== area)
                            );
                          }}
                        />
                        {area}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Observações (opcional)</Label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Comentários sobre o contato..."
                    className="text-sm"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={selectedAreas.length === 0}
                  className="w-full"
                >
                  Registrar Oportunidade
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
