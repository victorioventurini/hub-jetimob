/**
 * QbrMeetingCommitmentsStep - Step 4: Compromissos cross-área
 * 
 * Cada compromisso vinculado aos OKRs aprovados.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Handshake, Plus, X, ArrowRight } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrMeetingSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type CrossCommitment = QbrMeetingSnapshot['crossCommitments'][number];

export interface QbrMeetingCommitmentsStepProps {
  commitments: CrossCommitment[];
  onCommitmentsChange: (commitments: CrossCommitment[]) => void;
  teams: Array<{ id: string; name: string }>;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingCommitmentsStep({
  commitments,
  onCommitmentsChange,
  teams,
  onContinue,
  onBack,
}: QbrMeetingCommitmentsStepProps) {
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleAdd = () => {
    if (!fromTeam || !toTeam || !description.trim() || !deadline) return;
    onCommitmentsChange([
      ...commitments,
      { fromTeamId: fromTeam, toTeamId: toTeam, description: description.trim(), deadline },
    ]);
    setDescription('');
    setDeadline('');
  };

  const handleRemove = (index: number) => {
    onCommitmentsChange(commitments.filter((_, i) => i !== index));
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Time';

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Handshake}
          title="Compromissos Cross-Área"
          description="Dependências formalizadas entre times"
          variant="purple"
          badge={`${commitments.length} compromisso(s)`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Add commitment form */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">De (time)</Label>
                <Select value={fromTeam} onValueChange={setFromTeam}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Para (time)</Label>
                <Select value={toTeam} onValueChange={setToTeam}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o compromisso..."
              className="text-sm"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-xs flex-1"
              />
              <Button size="sm" onClick={handleAdd} disabled={!fromTeam || !toTeam || !description.trim() || !deadline}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commitments list */}
        {commitments.length > 0 ? (
          <div className="space-y-2">
            {commitments.map((c, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-[10px]">{getTeamName(c.fromTeamId)}</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="outline" className="text-[10px]">{getTeamName(c.toTeamId)}</Badge>
                        <span className="ml-auto">{c.deadline}</span>
                      </div>
                      <p className="text-sm">{c.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemove(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Handshake className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum compromisso registrado.</p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
