/**
 * HighlightsAndRisksStep — Step tripartite (acelerou / travou / atenção).
 * Variante 'learnings-risks' usado no Pré-QBR (worked / didn't / debt).
 *
 * CRUD inline:
 * - Adicionar item por seção (input + Enter ou botão "+")
 * - Editar título e descrição inline (clique no card abre form)
 * - Remover item via botão dedicado
 *
 * Mantém o shape `HighlightItem[]` em `data` — alterações fluem via
 * `onDataChange` para o hospedeiro persistir conforme o rito (draft).
 */

import { memo, useCallback, useState } from 'react';
import { TrendingUp, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { HighlightsAndRisksStepConfig } from '../types';
import type { HighlightItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface HighlightsAndRisksStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: HighlightsAndRisksStepConfig;
  data: HighlightItem[];
  onDataChange: (next: HighlightItem[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

const SECTION_TITLES: Record<HighlightsAndRisksStepConfig['variant'], Record<string, string>> = {
  'highlights-risks': {
    accelerated: 'Acelerou',
    blocked: 'Travou',
    attention: 'Atenção',
  },
  'learnings-risks': {
    worked: 'O que funcionou',
    'didnt-work': 'O que não funcionou',
    debt: 'Débitos',
  },
};

const SECTION_PLACEHOLDERS: Record<string, string> = {
  accelerated: 'O que destravou ou acelerou o ciclo...',
  blocked: 'O que travou ou bloqueou a execução...',
  attention: 'Sinal de risco que precisa de atenção...',
  worked: 'Iniciativa ou prática que deu certo...',
  'didnt-work': 'Tentativa que não gerou o resultado esperado...',
  debt: 'Débito técnico ou de processo identificado...',
};

function genId(): string {
  // crypto.randomUUID disponível em runtime moderno; fallback simples.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const HighlightsAndRisksStep = memo(function HighlightsAndRisksStep({
  persona,
  version,
  stepId,
  config,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: HighlightsAndRisksStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const sectionKeys = Object.keys(SECTION_TITLES[config.variant]) as HighlightItem['type'][];

  // Estado local: input por seção + edição em andamento
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<{ title: string; description: string }>({
    title: '',
    description: '',
  });

  const addItem = useCallback(
    (type: HighlightItem['type']) => {
      const title = (drafts[type] ?? '').trim();
      if (!title) return;
      const next: HighlightItem = { id: genId(), type, title };
      onDataChange([...data, next]);
      setDrafts((d) => ({ ...d, [type]: '' }));
    },
    [drafts, data, onDataChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onDataChange(data.filter((h) => h.id !== id));
      if (editingId === id) setEditingId(null);
    },
    [data, onDataChange, editingId],
  );

  const startEdit = useCallback((item: HighlightItem) => {
    setEditingId(item.id);
    setEditBuffer({ title: item.title, description: item.description ?? '' });
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const title = editBuffer.title.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    onDataChange(
      data.map((h) =>
        h.id === editingId
          ? { ...h, title, description: editBuffer.description.trim() || undefined }
          : h,
      ),
    );
    setEditingId(null);
  }, [editingId, editBuffer, data, onDataChange]);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={TrendingUp}
          title={label.title}
          description={label.subtitle}
          variant="primary"
          badge={data.length > 0 ? `${data.length}` : undefined}
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {sectionKeys.map((type) => {
          const items = data.filter((h) => h.type === type);
          return (
            <section key={type} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {SECTION_TITLES[config.variant][type]}
                </h3>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>

              {/* Lista existente */}
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sem registros.</p>
              ) : (
                items.map((h) =>
                  editingId === h.id ? (
                    <Card key={h.id} className="p-3 space-y-2 border-primary/40">
                      <Input
                        value={editBuffer.title}
                        onChange={(e) => setEditBuffer((b) => ({ ...b, title: e.target.value }))}
                        placeholder="Título"
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Textarea
                        value={editBuffer.description}
                        onChange={(e) =>
                          setEditBuffer((b) => ({ ...b, description: e.target.value }))
                        }
                        placeholder="Descrição (opcional)"
                        className="min-h-[60px] text-xs"
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={cancelEdit}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={commitEdit}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Salvar
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card key={h.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{h.title}</p>
                          {h.description && (
                            <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(h)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(h.id)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ),
                )
              )}

              {/* Input para adicionar */}
              <div className="flex gap-2">
                <Input
                  value={drafts[type] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [type]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addItem(type);
                    }
                  }}
                  placeholder={SECTION_PLACEHOLDERS[type] ?? 'Adicionar...'}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => addItem(type)}
                  disabled={!(drafts[type] ?? '').trim()}
                  aria-label="Adicionar"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </WizardStepScaffold>
  );
});
