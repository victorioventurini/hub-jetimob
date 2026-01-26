import { Users, Lock, Link2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamSelect, SimpleSelect, MultiTeamSelect, CycleSelect } from '@/components/selects';
import { VicActionButton } from '@/modules/vic';
import type { FlatTeamItem } from '@/modules/teams/hooks';
import type { OkrStatus } from '../../types';
import type { Cycle } from '../../hooks/useCycleData';
import { STATUS_OPTIONS, RESPONSIBILITY_MODEL_OPTIONS } from './teamObjectiveFormTypes';

interface TeamObjectiveFormFieldsProps {
  isEditing: boolean;
  isPending: boolean;
  hasManageableTeams: boolean;
  isLoadingManageable: boolean;
  isTeamSelectReadOnly: boolean;
  
  // Form values
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  teamId: string | undefined;
  setTeamId: (v: string | undefined) => void;
  orgObjectiveId: string;
  setOrgObjectiveId: (v: string) => void;
  cycleId: string | undefined;
  setCycleId: (v: string | undefined) => void;
  status: OkrStatus;
  setStatus: (v: OkrStatus) => void;
  isShared: boolean;
  setIsShared: (v: boolean) => void;
  contributingTeamIds: string[];
  setContributingTeamIds: (v: string[]) => void;
  responsibilityModel: 'collaborative' | 'primary_led';
  setResponsibilityModel: (v: 'collaborative' | 'primary_led') => void;
  
  // Data
  allowedTeamsForCreate: FlatTeamItem[];
  hierarchicalTeams: FlatTeamItem[];
  orgObjectiveOptions: Array<{ value: string; label: string }>;
  cycles: Cycle[];
  selectedPrimaryTeamName?: string;
  objectiveTeamId?: string;
}

export function TeamObjectiveFormFields({
  isEditing,
  isPending,
  hasManageableTeams,
  isLoadingManageable,
  isTeamSelectReadOnly,
  title, setTitle,
  description, setDescription,
  teamId, setTeamId,
  orgObjectiveId, setOrgObjectiveId,
  cycleId, setCycleId,
  status, setStatus,
  isShared, setIsShared,
  contributingTeamIds, setContributingTeamIds,
  responsibilityModel, setResponsibilityModel,
  allowedTeamsForCreate,
  hierarchicalTeams,
  orgObjectiveOptions,
  cycles,
  selectedPrimaryTeamName,
  objectiveTeamId,
}: TeamObjectiveFormFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      {/* Team selection - only for create mode */}
      {!isEditing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="team">Time Primário *</Label>
            {isTeamSelectReadOnly && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          {!hasManageableTeams ? (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">
                Você não tem permissão para criar OKRs em nenhum time. 
                Apenas líderes de time podem criar OKRs para seu time e sub-times.
              </AlertDescription>
            </Alert>
          ) : isTeamSelectReadOnly ? (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <span className="text-sm font-medium">
                {allowedTeamsForCreate[0]?.name}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                (único time disponível)
              </span>
            </div>
          ) : (
            <TeamSelect
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value);
                if (value) {
                  setContributingTeamIds(contributingTeamIds.filter(id => id !== value));
                }
              }}
              teams={allowedTeamsForCreate}
              placeholder="Selecione o time responsável"
              disabled={isPending || isLoadingManageable}
              triggerClassName="w-full"
            />
          )}
          {allowedTeamsForCreate.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Você pode criar OKRs para seu time e sub-times sob sua gestão.
            </p>
          )}
        </div>
      )}

      {/* Org objective selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="org-objective">
            Objetivo Organizacional {!isEditing && '*'}
          </Label>
        </div>
        <SimpleSelect
          value={orgObjectiveId}
          onValueChange={setOrgObjectiveId}
          options={orgObjectiveOptions}
          placeholder="Vincule a um objetivo organizacional"
          disabled={isPending}
          triggerClassName="w-full"
        />
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Alterar o vínculo não afeta o histórico de progresso já registrado.
          </p>
        )}
      </div>

      {/* Cycle selection - only for create mode */}
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="cycle">Ciclo *</Label>
          <CycleSelect
            value={cycleId}
            onValueChange={setCycleId}
            cycles={cycles.filter(c => c.type === 'quarter')}
            placeholder="Selecione o ciclo do objetivo"
            disabled={isPending}
            required
            showPeriodPreview
          />
        </div>
      )}

      {/* Shared OKR Toggle */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-status-purple" />
          <div>
            <Label htmlFor="is-shared" className="text-sm font-medium cursor-pointer">
              OKR Compartilhada
            </Label>
            <p className="text-xs text-muted-foreground">
              Envolve múltiplos times trabalhando juntos
            </p>
          </div>
        </div>
        <Switch
          id="is-shared"
          checked={isShared}
          onCheckedChange={setIsShared}
          disabled={isPending}
        />
      </div>

      {/* Shared OKR Fields */}
      {isShared && (
        <div className="space-y-4 p-4 rounded-lg border border-accent bg-accent/30">
          <Alert className="border-accent bg-accent/50">
            <Users className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-accent-foreground">
              {selectedPrimaryTeamName 
                ? `${selectedPrimaryTeamName} será o time primário responsável.`
                : 'Selecione o time primário acima.'}
              {' '}Adicione os times que irão contribuir para esta OKR.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Times Contribuidores *</Label>
            <MultiTeamSelect
              value={contributingTeamIds}
              onValueChange={setContributingTeamIds}
              excludeTeamIds={isEditing && objectiveTeamId ? [objectiveTeamId] : (teamId ? [teamId] : [])}
              teams={hierarchicalTeams}
              placeholder="Selecione os times contribuidores"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Modelo de Responsabilidade</Label>
            <SimpleSelect
              value={responsibilityModel}
              onValueChange={(v) => setResponsibilityModel(v as 'collaborative' | 'primary_led')}
              options={[...RESPONSIBILITY_MODEL_OPTIONS]}
              disabled={isPending}
              triggerClassName="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {responsibilityModel === 'collaborative' 
                ? 'Todos os times são igualmente responsáveis pelo sucesso da OKR.'
                : 'O time primário lidera, os outros contribuem com suas entregas.'}
            </p>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Título *</Label>
          {!isEditing && title.trim() && (
            <VicActionButton
              agentSlug="validador-metodologico-okrs"
              actionContext="okr-create-objective"
              context={{
                type: "Objetivo de Time",
                title,
                description: description || undefined,
              }}
              label="Melhorar objetivo"
              compact
              onApply={(response) => {
                const lines = response.split('\n').filter(l => l.trim());
                if (lines[0]) {
                  setTitle(lines[0].replace(/^[-*•]\s*/, '').trim());
                }
              }}
            />
          )}
        </div>
        <Input
          id="title"
          placeholder="Ex: Melhorar o NPS do time de suporte"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o objetivo e seu contexto..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status {isEditing ? '' : 'inicial'}</Label>
        {isEditing ? (
          <Select value={status} onValueChange={(v) => setStatus(v as OkrStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <SimpleSelect
            value={status}
            onValueChange={(v) => setStatus(v as OkrStatus)}
            options={[...STATUS_OPTIONS]}
            disabled={isPending}
            triggerClassName="w-full"
          />
        )}
      </div>
    </div>
  );
}
