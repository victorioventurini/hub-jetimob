/**
 * TeamOkrInitiativesStep - Step 7: Iniciativas
 * 
 * Cap. 7 do storytelling:
 * - Sugere iniciativas apenas quando fizer sentido
 * - Explica que iniciativas não são metas
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Lightbulb, Plus, Trash2, Sparkles } from 'lucide-react';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { WizardOptionalStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import type { DraftTeamKr, DraftTeamInitiative } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrInitiativesStepProps {
  draftKrs: DraftTeamKr[];
  initiatives: DraftTeamInitiative[];
  /** ID do time para filtrar usuários no BuUserSelect */
  teamId?: string;
  onInitiativesChange: (initiatives: DraftTeamInitiative[]) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function shouldSuggestInitiatives(kr: DraftTeamKr): boolean {
  // Suggest for enablers, high targets, or contribution types
  return kr.type === 'enabler' || kr.type === 'contribution';
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrInitiativesStep({
  draftKrs,
  initiatives,
  teamId,
  onInitiativesChange,
  onContinue,
  onBack,
  onSkip,
}: TeamOkrInitiativesStepProps) {
  const [expandedKrs, setExpandedKrs] = useState<string[]>([]);

  // Group initiatives by KR
  const initiativesByKr = useMemo(() => {
    const grouped: Record<number, DraftTeamInitiative[]> = {};
    initiatives.forEach(init => {
      if (!grouped[init.krIndex]) {
        grouped[init.krIndex] = [];
      }
      grouped[init.krIndex].push(init);
    });
    return grouped;
  }, [initiatives]);

  // KRs that should have initiatives suggested
  const suggestedKrs = useMemo(() => {
    return draftKrs
      .map((kr, index) => ({ kr, index }))
      .filter(({ kr }) => shouldSuggestInitiatives(kr));
  }, [draftKrs]);

  // Add initiative to a KR
  const handleAddInitiative = (krIndex: number) => {
    const newInit: DraftTeamInitiative = {
      krIndex,
      name: '',
      owner_user_id: null,
    };
    onInitiativesChange([...initiatives, newInit]);
  };

  // Update an initiative
  const handleUpdateInitiative = (
    index: number,
    field: keyof DraftTeamInitiative,
    value: string
  ) => {
    const updated = [...initiatives];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onInitiativesChange(updated);
  };

  // Remove an initiative
  const handleRemoveInitiative = (index: number) => {
    const updated = initiatives.filter((_, i) => i !== index);
    onInitiativesChange(updated);
  };

  // Find initiative global index
  const getInitiativeIndex = (krIndex: number, localIndex: number): number => {
    let count = 0;
    for (let i = 0; i < initiatives.length; i++) {
      if (initiatives[i].krIndex === krIndex) {
        if (count === localIndex) return i;
        count++;
      }
    }
    return -1;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Iniciativas</h2>
              <WizardTooltipInline tooltipKey="initiatives-intro" />
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'initiatives',
                  additionalData: { krsCount: draftKrs.length },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Iniciativas são ações que podem ajudar a atingir os KRs. São opcionais.
            </p>
          </div>

          {/* Vic Quote */}
          <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
            <p className="text-sm italic">
              "KRs dizem onde chegar. Iniciativas dizem por onde tentar."
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Vic
            </p>
          </div>

          {/* Info Card */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Lembre-se:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Iniciativas não são metas</li>
                    <li>Iniciativas podem mudar durante o ciclo</li>
                    <li>Iniciativas não são avaliadas como sucesso/fracasso</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KRs with initiative suggestions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">KRs que podem se beneficiar de iniciativas:</h3>

            <Accordion 
              type="multiple" 
              value={expandedKrs}
              onValueChange={setExpandedKrs}
            >
              {draftKrs.map((kr, krIndex) => {
                const krInitiatives = initiativesByKr[krIndex] || [];
                const shouldSuggest = shouldSuggestInitiatives(kr);
                
                return (
                  <AccordionItem key={krIndex} value={String(krIndex)}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="text-sm font-medium">{kr.title}</span>
                        {shouldSuggest && (
                          <Badge variant="outline" className="text-xs">
                            Sugerido
                          </Badge>
                        )}
                        {krInitiatives.length > 0 && (
                          <Badge className="text-xs">
                            {krInitiatives.length} iniciativa{krInitiatives.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Existing initiatives */}
                        {krInitiatives.map((init, localIndex) => {
                          const globalIndex = getInitiativeIndex(krIndex, localIndex);
                          
                          return (
                            <Card key={localIndex}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <Label>Iniciativa {localIndex + 1}</Label>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveInitiative(globalIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <Input
                                  placeholder="Nome da iniciativa"
                                  value={init.name}
                                  onChange={(e) => handleUpdateInitiative(globalIndex, 'name', e.target.value)}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Responsável</Label>
                                    <BuUserSelect
                                      value={init.owner_user_id || undefined}
                                      onValueChange={(value) => handleUpdateInitiative(globalIndex, 'owner_user_id', value)}
                                      teamId={teamId}
                                      placeholder="Selecione"
                                      showBadges={false}
                                    />
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <Label className="text-xs">Prazo (opcional)</Label>
                                    <Input
                                      type="date"
                                      value={init.expected_end_date || ''}
                                      onChange={(e) => handleUpdateInitiative(globalIndex, 'expected_end_date', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {/* Add initiative button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => handleAddInitiative(krIndex)}
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar iniciativa
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Summary */}
          {initiatives.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {initiatives.length} iniciativa{initiatives.length > 1 ? 's' : ''} planejada{initiatives.length > 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <WizardOptionalStepFooter
        onBack={onBack}
        primaryLabel="Preparar comunicação"
        onPrimary={onContinue}
        skipLabel="Pular"
        onSkip={onSkip}
      />
    </div>
  );
}
