/**
 * TeamOkrSharingStep - Capítulo 4.5 do storytelling
 * 
 * Pergunta se o objetivo é exclusivo ou compartilhado com outros times.
 * Guia o líder na definição do modelo de responsabilidade.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MultiTeamSelect } from '@/components/selects/MultiTeamSelect';
import { VicActionButton, VicLoadingState, VicTypewriterText } from '@/modules/vic';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  User, 
  HandshakeIcon,
  Sparkles,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlatTeamItem } from '@/modules/teams/hooks/useTeams';

// ============================================================
// TYPES
// ============================================================

export type ResponsibilityModel = 'collaborative' | 'primary_led';
export type OwnerType = 'my_team' | 'other_team' | 'co_ownership';

export interface TeamOkrSharingStepProps {
  objectiveTitle: string;
  teamId: string;
  teamName: string;
  isShared: boolean;
  responsibilityModel: ResponsibilityModel;
  ownerType: OwnerType;
  primaryTeamId: string;
  contributingTeamIds: string[];
  availableTeams: FlatTeamItem[];
  isLoadingTeams: boolean;
  onIsSharedChange: (isShared: boolean) => void;
  onResponsibilityModelChange: (model: ResponsibilityModel) => void;
  onOwnerTypeChange: (type: OwnerType) => void;
  onPrimaryTeamChange: (teamId: string) => void;
  onContributingTeamsChange: (teamIds: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrSharingStep({
  objectiveTitle,
  teamId,
  teamName,
  isShared,
  responsibilityModel,
  ownerType,
  primaryTeamId,
  contributingTeamIds,
  availableTeams,
  isLoadingTeams,
  onIsSharedChange,
  onResponsibilityModelChange,
  onOwnerTypeChange,
  onPrimaryTeamChange,
  onContributingTeamsChange,
  onContinue,
  onBack,
}: TeamOkrSharingStepProps) {
  // AI insights
  const { invokeVic, isVicLoading } = useWizardAI();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // Generate AI insight on mount
  const generateSharingInsight = useCallback(async () => {
    if (!objectiveTitle) return;
    setIsGeneratingInsight(true);
    try {
      const response = await invokeVic(
        'alinhamento-estrategico',
        'okr-check-alignment',
        {
          type: 'objetivo-compartilhamento',
          title: objectiveTitle,
          additionalData: {
            teamName,
            step: 'sharing',
          },
        },
        'Analise se este objetivo tipicamente requer colaboração entre times. Responda em 1-2 frases.'
      );
      setAiInsight(response.response);
    } catch (error) {
      console.error('Error generating sharing insight:', error);
      // Fallback insight
      setAiInsight('Pelo histórico de times similares, objetivos como este frequentemente envolvem colaboração entre áreas. Considere se outros times podem contribuir para o sucesso.');
    } finally {
      setIsGeneratingInsight(false);
    }
  }, [objectiveTitle, teamName, invokeVic]);

  useEffect(() => {
    generateSharingInsight();
  }, [generateSharingInsight]);

  // Handle shared change
  const handleSharedChange = (value: string) => {
    const shared = value === 'shared';
    onIsSharedChange(shared);
    if (!shared) {
      // Reset sharing state when switching to exclusive
      onContributingTeamsChange([]);
      onOwnerTypeChange('my_team');
      onPrimaryTeamChange(teamId);
    }
  };

  // Handle owner type change
  const handleOwnerTypeChange = (value: string) => {
    const type = value as OwnerType;
    onOwnerTypeChange(type);
    
    if (type === 'my_team' || type === 'co_ownership') {
      onPrimaryTeamChange(teamId);
      // For co_ownership, set responsibility_model to collaborative
      if (type === 'co_ownership') {
        onResponsibilityModelChange('collaborative');
      } else {
        onResponsibilityModelChange('primary_led');
      }
    }
  };

  // Validation
  const canContinue = !isShared || (
    contributingTeamIds.length > 0 &&
    (ownerType === 'my_team' || ownerType === 'co_ownership' || (ownerType === 'other_team' && primaryTeamId !== teamId))
  );

  // Get other teams (excluding current team)
  const otherTeams = availableTeams.filter(t => t.id !== teamId);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Esse objetivo é só do seu time?
          </h2>
          <p className="text-sm text-muted-foreground">
            Antes de definir os KRs, precisamos entender se outros times também são responsáveis por esse objetivo.
          </p>
        </div>

        {/* AI Insight Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-primary">
                Insight do alinhamento estratégico
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isGeneratingInsight ? (
              <VicLoadingState 
                text="Analisando contexto..." 
                variant="inline" 
                size="sm" 
              />
            ) : aiInsight ? (
              <p className="text-sm text-foreground/80">
                <VicTypewriterText text={aiInsight} speed={20} />
              </p>
            ) : (
              <p className="text-sm text-foreground/80">
                Objetivos como este raramente são alcançados por um único time.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Objective Summary */}
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Objetivo:</span>{' '}
              <span className="font-medium">{objectiveTitle || 'Não definido'}</span>
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Main Question - Exclusive or Shared */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Este objetivo é:
          </Label>
          
          <RadioGroup 
            value={isShared ? 'shared' : 'exclusive'} 
            onValueChange={handleSharedChange}
            className="space-y-3"
          >
            {/* Exclusive Option */}
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                !isShared 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              )}
              onClick={() => handleSharedChange('exclusive')}
            >
              <RadioGroupItem value="exclusive" id="exclusive" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="exclusive" className="font-medium cursor-pointer">
                    Exclusivo do meu time
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Apenas {teamName} é responsável por entregar este objetivo.
                </p>
              </div>
            </div>

            {/* Shared Option */}
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                isShared 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              )}
              onClick={() => handleSharedChange('shared')}
            >
              <RadioGroupItem value="shared" id="shared" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="shared" className="font-medium cursor-pointer">
                    Compartilhado com outro(s) time(s)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Outros times também contribuem para atingir este objetivo.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Shared OKR Configuration */}
        {isShared && (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2">
            <Separator />

            {/* Contributing Teams Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Times contribuidores
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecione os times que também são responsáveis por este objetivo.
              </p>
              <MultiTeamSelect
                value={contributingTeamIds}
                onValueChange={onContributingTeamsChange}
                excludeTeamIds={[teamId]}
                teams={otherTeams}
                disabled={isLoadingTeams}
                placeholder="Selecione os times contribuidores"
              />
              {contributingTeamIds.length === 0 && isShared && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Selecione pelo menos um time contribuidor
                </p>
              )}
            </div>

            {/* Owner Definition */}
            {contributingTeamIds.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    Quem é o owner final?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Em OKRs compartilhadas, clareza de responsabilidade é mais importante do que igualdade de esforço.
                  </p>
                </div>

                <RadioGroup 
                  value={ownerType} 
                  onValueChange={handleOwnerTypeChange}
                  className="space-y-3"
                >
                  {/* My Team Leads */}
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                      ownerType === 'my_team' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    )}
                    onClick={() => handleOwnerTypeChange('my_team')}
                  >
                    <RadioGroupItem value="my_team" id="my_team" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="my_team" className="font-medium cursor-pointer">
                        Meu time ({teamName}) lidera
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {teamName} é o owner principal, outros times contribuem.
                      </p>
                    </div>
                  </div>

                  {/* Other Team Leads */}
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                      ownerType === 'other_team' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    )}
                    onClick={() => handleOwnerTypeChange('other_team')}
                  >
                    <RadioGroupItem value="other_team" id="other_team" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="other_team" className="font-medium cursor-pointer">
                        Outro time lidera
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Outro time é o owner principal, {teamName} contribui.
                      </p>
                      {ownerType === 'other_team' && contributingTeamIds.length > 0 && (
                        <div className="mt-3">
                          <Label className="text-sm">Selecione o time líder:</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {contributingTeamIds.map(tId => {
                              const team = availableTeams.find(t => t.id === tId);
                              if (!team) return null;
                              return (
                                <Badge
                                  key={tId}
                                  variant={primaryTeamId === tId ? "default" : "outline"}
                                  className="cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPrimaryTeamChange(tId);
                                  }}
                                >
                                  {team.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Co-ownership */}
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                      ownerType === 'co_ownership' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    )}
                    onClick={() => handleOwnerTypeChange('co_ownership')}
                  >
                    <RadioGroupItem value="co_ownership" id="co_ownership" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="co_ownership" className="font-medium cursor-pointer">
                          Co-ownership
                        </Label>
                        <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Responsabilidade genuinamente compartilhada entre os times.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Coach Insight */}
            <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
              <CardContent className="py-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Coach de OKRs:</strong> Em OKRs compartilhadas, KRs do tipo "Fundacional" devem ser evitados. 
                    Prefira KRs de "Contribuição" que medem a parte do resultado sob responsabilidade de cada time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VIC Button */}
        <div className="pt-2">
          <VicActionButton
            agentSlug="coach-okrs"
            actionContext="okr-check-alignment"
            context={{
              type: 'OKR Compartilhada',
              title: objectiveTitle,
              additionalData: {
                teamName,
                isShared,
                contributingTeamIds,
              },
            }}
            label="Dúvidas sobre OKRs compartilhadas?"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <Button onClick={onContinue} disabled={!canContinue}>
            Continuar
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
