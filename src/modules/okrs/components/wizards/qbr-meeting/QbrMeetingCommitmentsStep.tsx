/**
 * QbrMeetingCommitmentsStep - Step 4: Compromissos cross-área
 * 
 * Cada compromisso vinculado aos OKRs aprovados.
 * Inclui: responsável por compromisso e vínculo a OKR aprovado.
 */

import { useState, useMemo } from 'react';
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
import { BuUserSelect } from '@/components/selects';
import { Handshake, Plus, X, ArrowRight, Target, User } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { QbrMeetingSnapshot, ProposedObjectiveEntry, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { TeamForReview } from './QbrMeetingOkrReviewStep';

// ============================================================
// TYPES
// ============================================================

type CrossCommitment = QbrMeetingSnapshot['crossCommitments'][number];

export interface QbrMeetingCommitmentsStepProps {
  commitments: CrossCommitment[];
  onCommitmentsChange: (commitments: CrossCommitment[]) => void;
  teams: Array<{ id: string; name: string }>;
  /** Aprovações do Step 2 para vínculo de OKR */
  approvals?: QbrMeetingSnapshot['approvals'];
  /** Times com suas propostas para exibir OKRs aprovados */
  teamsForReview?: TeamForReview[];
  /** Decisões inline */
  decisions?: TeamCheckinDecision[];
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
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
  approvals = [],
  teamsForReview = [],
  decisions = [],
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrMeetingCommitmentsStepProps) {
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState<string | undefined>();
  const [responsibleUserName, setResponsibleUserName] = useState<string | undefined>();
  const [linkedOkrId, setLinkedOkrId] = useState<string | undefined>();

  // Build list of approved OKR objectives for linking
  const approvedOkrs = useMemo(() => {
    const result: Array<{ id: string; title: string; teamName: string }> = [];
    const approvedTeamIds = new Set(
      approvals
        .filter(a => a.status === 'approved' || a.status === 'approved_with_changes')
        .map(a => a.teamId)
    );

    for (const team of teamsForReview) {
      if (!approvedTeamIds.has(team.teamId)) continue;
      for (const entry of team.proposedOkrs) {
        result.push({
          id: entry.id,
          title: entry.objective.title,
          teamName: team.teamName,
        });
      }
    }
    return result;
  }, [approvals, teamsForReview]);

  const handleAdd = () => {
    if (!fromTeam || !toTeam || !description.trim() || !deadline) return;
    onCommitmentsChange([
      ...commitments,
      {
        fromTeamId: fromTeam,
        toTeamId: toTeam,
        description: description.trim(),
        deadline,
        responsibleUserId,
        responsibleUserName,
        linkedOkrId: linkedOkrId || undefined,
      },
    ]);
    setDescription('');
    setDeadline('');
    setResponsibleUserId(undefined);
    setResponsibleUserName(undefined);
    setLinkedOkrId(undefined);
  };

  const handleRemove = (index: number) => {
    onCommitmentsChange(commitments.filter((_, i) => i !== index));
  };

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Time';
  const getOkrTitle = (id?: string) => approvedOkrs.find(o => o.id === id);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Handshake}
          title="Compromissos Cross-Área"
          tooltip="qbr-meeting-commitments"
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

            {/* Responsible user */}
            <div className="space-y-1">
              <Label className="text-xs">Responsável (opcional)</Label>
              <BuUserSelect
                value={responsibleUserId}
                onValueChange={() => {}}
                onUserSelected={(user) => {
                  if (user) {
                    setResponsibleUserId(user.id);
                    setResponsibleUserName(user.displayName);
                  } else {
                    setResponsibleUserId(undefined);
                    setResponsibleUserName(undefined);
                  }
                }}
                placeholder="Selecione o responsável"
                allowNone
                noneLabel="Sem responsável"
                showSearch
                showBadges={false}
                className="h-8 text-xs"
              />
            </div>

            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o compromisso..."
              className="text-sm"
            />

            {/* Linked OKR */}
            {approvedOkrs.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">OKR vinculado (opcional)</Label>
                <Select value={linkedOkrId || '__none__'} onValueChange={(v) => setLinkedOkrId(v === '__none__' ? undefined : v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem vínculo</SelectItem>
                    {approvedOkrs.map(okr => (
                      <SelectItem key={okr.id} value={okr.id}>
                        {okr.teamName}: {okr.title.slice(0, 50)}{okr.title.length > 50 ? '…' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
            {commitments.map((c, i) => {
              const linkedOkr = getOkrTitle(c.linkedOkrId);
              return (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{getTeamName(c.fromTeamId)}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className="text-[10px]">{getTeamName(c.toTeamId)}</Badge>
                          {c.responsibleUserName && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <User className="h-2.5 w-2.5" />
                              {c.responsibleUserName}
                            </Badge>
                          )}
                          <span className="ml-auto">{c.deadline}</span>
                        </div>
                        <p className="text-sm">{c.description}</p>
                        {linkedOkr && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] gap-0.5 text-primary">
                              <Target className="h-2.5 w-2.5" />
                              {linkedOkr.teamName}: {linkedOkr.title.slice(0, 40)}{linkedOkr.title.length > 40 ? '…' : ''}
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
              );
            })}
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
