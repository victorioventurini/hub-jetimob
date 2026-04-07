/**
 * QbrPostCommitmentsStep - Step 3: Formalização de compromissos cross-área
 * 
 * Carrega compromissos do meeting e permite completar com datas, responsável nominal e OKR vinculado.
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
import { Handshake, Plus, X, ArrowRight, User, Target } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import { BuUserSelect } from '@/components/selects';
import type { QbrPostSnapshot } from '@/modules/okrs/types/wizard';
import type { ApprovedTeamOkr } from './QbrPostOkrPromotionStep';

// ============================================================
// TYPES
// ============================================================

type CrossCommitment = QbrPostSnapshot['crossCommitments'][number];

export interface QbrPostCommitmentsStepProps {
  commitments: CrossCommitment[];
  onCommitmentsChange: (commitments: CrossCommitment[]) => void;
  teams: Array<{ id: string; name: string }>;
  /** OKRs aprovados para link opcional */
  approvedOkrs?: ApprovedTeamOkr[];
  /** IDs de sessões marcadas para promoção no Step 1 */
  promotedSessionIds?: string[];
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostCommitmentsStep({
  commitments,
  onCommitmentsChange,
  teams,
  approvedOkrs = [],
  promotedSessionIds = [],
  onContinue,
  onBack,
}: QbrPostCommitmentsStepProps) {
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState<string | null>(null);
  const [responsibleUserName, setResponsibleUserName] = useState<string>('');
  const [linkedOkrId, setLinkedOkrId] = useState<string>('');

  // Build list of promotable OKRs for the link select
  const promotedOkrOptions = approvedOkrs
    .filter(o => promotedSessionIds.includes(o.sessionId))
    .flatMap(o => o.proposedOkrs.map(p => ({
      id: p.id,
      label: `${o.teamName}: ${p.objective.title}`,
    })));

  const handleAdd = () => {
    if (!fromTeam || !toTeam || !description.trim() || !deadline) return;
    onCommitmentsChange([
      ...commitments,
      {
        fromTeamId: fromTeam,
        toTeamId: toTeam,
        description: description.trim(),
        deadline,
        dependencyId: '',
        responsibleUserId: responsibleUserId || undefined,
        responsibleUserName: responsibleUserName || undefined,
        linkedOkrId: linkedOkrId || undefined,
      },
    ]);
    setDescription('');
    setDeadline('');
    setResponsibleUserId(null);
    setResponsibleUserName('');
    setLinkedOkrId('');
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
          title="Compromissos Formalizados"
          tooltip="qbr-post-commitments"
          description="Dependências cross-área com prazo e responsável definidos"
          variant="purple"
          badge={`${commitments.length} compromisso(s)`}
        />
      }
      footer={
        <WizardStepFooter onBack={onBack} onPrimary={onContinue} />
      }
    >
      <div className="p-6 space-y-6">
        {/* Existing commitments */}
        {commitments.length > 0 && (
          <div className="space-y-2">
            {commitments.map((c, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{getTeamName(c.fromTeamId)}</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="outline" className="text-[10px]">{getTeamName(c.toTeamId)}</Badge>
                        {c.responsibleUserName && (
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            <User className="h-2.5 w-2.5 mr-0.5" />
                            {c.responsibleUserName}
                          </Badge>
                        )}
                        <span className="ml-auto">{c.deadline}</span>
                      </div>
                      <p className="text-sm">{c.description}</p>
                      {c.linkedOkrId && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                            <Target className="h-2.5 w-2.5 mr-0.5" />
                            OKR vinculado
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemove(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add new */}
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

            {/* Responsible user */}
            <div className="space-y-1">
              <Label className="text-xs">Responsável (opcional)</Label>
              <BuUserSelect
                value={responsibleUserId}
                onUserSelected={(meta) => {
                  if (meta) {
                    setResponsibleUserId(meta.id);
                    setResponsibleUserName(meta.displayName);
                  } else {
                    setResponsibleUserId(null);
                    setResponsibleUserName('');
                  }
                }}
                placeholder="Selecione o responsável..."
                className="text-xs"
              />
            </div>

            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o compromisso..." className="text-sm" />
            
            <div className="flex gap-2">
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="text-xs flex-1" />
            </div>

            {/* Linked OKR */}
            {promotedOkrOptions.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">OKR vinculado (opcional)</Label>
                <Select value={linkedOkrId} onValueChange={setLinkedOkrId}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {promotedOkrOptions.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button size="sm" onClick={handleAdd} disabled={!fromTeam || !toTeam || !description.trim() || !deadline} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar compromisso
            </Button>
          </CardContent>
        </Card>

        {commitments.length === 0 && (
          <div className="text-center py-8">
            <Handshake className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum compromisso registrado.</p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
