/**
 * PreWeeklyPautaStep — Step 2 do Pré-Weekly v2
 *
 * "Preparação da Pauta" — selecionar até 3 temas que sobem para a Weekly da BU.
 *
 * Cada tema é classificado em:
 *  - Performance (números/KPIs/KRs)
 *  - Projetos (entregas estruturais)
 *  - Pessoas (sinais estruturais — separado em Step 3, mas pode aparecer aqui)
 *
 * SCAFFOLDING: persistência local via draft (sem novas tabelas). O agente
 * `curador-orquestrador` consumirá esses tópicos no futuro Weekly v2.
 */

import { useCallback } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type {
  PreWeeklyTopic,
  PreWeeklyTopicCategory,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_TOPICS = 3;

const CATEGORY_LABEL: Record<PreWeeklyTopicCategory, string> = {
  performance: 'Performance',
  projetos: 'Projetos',
};

/**
 * Normaliza categorias legadas (drafts antigos com 'pessoas') para uma categoria válida.
 * Pessoas tem etapa dedicada (Step 3) — não aparece como categoria de tema.
 */
function normalizeCategory(category: string | undefined): PreWeeklyTopicCategory {
  if (category === 'projetos') return 'projetos';
  return 'performance';
}

// ============================================================
// TYPES
// ============================================================

export interface PreWeeklyPautaStepProps {
  topics: PreWeeklyTopic[];
  onTopicsChange: (topics: PreWeeklyTopic[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function PreWeeklyPautaStep({
  topics,
  onTopicsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: PreWeeklyPautaStepProps) {
  const canAdd = topics.length < MAX_TOPICS;

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    const newTopic: PreWeeklyTopic = {
      id: `topic-${Date.now()}`,
      title: '',
      category: 'performance',
      priority: 'medium',
      context: '',
    };
    onTopicsChange([...topics, newTopic]);
  }, [topics, canAdd, onTopicsChange]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<PreWeeklyTopic>) => {
      onTopicsChange(topics.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [topics, onTopicsChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onTopicsChange(topics.filter((t) => t.id !== id));
    },
    [topics, onTopicsChange],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ListChecks}
          title="Preparação da Pauta"
          description={`Selecione até ${MAX_TOPICS} temas que sobem para a Weekly`}
          variant="amber"
          rightContent={
            <Badge variant="outline" className="text-xs">
              {topics.length}/{MAX_TOPICS}
            </Badge>
          }
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="pre-weekly-pauta"
          placeholder="Registrar decisão sobre prioridade ou priorização…"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Continuar para Pessoas"
        />
      }
    >
      <div className="p-4 sm:p-6 space-y-4">
        {topics.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Nenhum tema adicionado ainda.
              </p>
              <Button onClick={handleAdd} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar primeiro tema
              </Button>
            </CardContent>
          </Card>
        )}

        {topics.map((topic, idx) => (
          <Card key={topic.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Tema {idx + 1}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(topic.id)}
                aria-label="Remover tema"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`title-${topic.id}`} className="text-xs">
                  Título
                </Label>
                <Input
                  id={`title-${topic.id}`}
                  value={topic.title}
                  onChange={(e) => handleUpdate(topic.id, { title: e.target.value })}
                  placeholder="Ex.: Queda do MRR no segmento X"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={topic.category}
                    onValueChange={(v) =>
                      handleUpdate(topic.id, { category: v as PreWeeklyTopicCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABEL) as PreWeeklyTopicCategory[]).map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Prioridade</Label>
                  <Select
                    value={topic.priority}
                    onValueChange={(v) =>
                      handleUpdate(topic.id, { priority: v as PreWeeklyTopicPriority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as PreWeeklyTopicPriority[]).map(
                        (p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`context-${topic.id}`} className="text-xs">
                  Contexto (opcional)
                </Label>
                <Textarea
                  id={`context-${topic.id}`}
                  value={topic.context ?? ''}
                  onChange={(e) => handleUpdate(topic.id, { context: e.target.value })}
                  placeholder="Resumo, dados de apoio, decisão proposta…"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs border-0', PRIORITY_BADGE[topic.priority])}>
                  {PRIORITY_LABEL[topic.priority]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABEL[topic.category]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {topics.length > 0 && canAdd && (
          <Button
            onClick={handleAdd}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar mais um tema
          </Button>
        )}
      </div>
    </WizardStepScaffold>
  );
}
