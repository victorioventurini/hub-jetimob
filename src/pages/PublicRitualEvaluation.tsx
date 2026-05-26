/**
 * PublicRitualEvaluation — Página pública (sem login) `/p/r/:shortCode`
 *
 * Coleta anônima 100% client-side via `globalClient` (PRE-BU). A BU é resolvida
 * server-side pelas RPCs `SECURITY DEFINER` (validam o short_code).
 *
 * Princípios canônicos:
 *  - PRE-BU: importa `@/integrations/supabase/globalClient` (sem BuProvider).
 *  - Anonimato técnico: nenhum `auth.uid()`/JWT/IP/UA é gravado nas respostas.
 *  - Mobile-first: layout otimizado para celular durante o rito.
 *  - Sem heurística no front — disponibilidade vem do `is_open` da RPC.
 *
 * Permission keys: nenhuma (rota pública).
 */

import { memo, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  usePublicRitualEvaluationForm,
  useSubmitRitualEvaluation,
} from '@/modules/okrs/components/wizards/shared/framework/hooks/usePublicRitualEvaluation';

import type { EvaluationDimensionKey } from '@/modules/okrs/components/wizards/shared/framework/config/evaluationConfig';

const SCALE = [1, 2, 3, 4, 5] as const;

const DIMENSION_META: Record<
  EvaluationDimensionKey,
  { label: string; hintLow: string; hintHigh: string }
> = {
  value:     { label: 'Este rito gerou valor para a empresa?',    hintLow: 'Pouco valor',  hintHigh: 'Muito valor' },
  quality:   { label: 'A qualidade da discussão foi alta?',        hintLow: 'Baixa',         hintHigh: 'Alta' },
  decisions: { label: 'As decisões saíram claras (dono e prazo)?', hintLow: 'Pouco claras',  hintHigh: 'Muito claras' },
  time:      { label: 'O uso do tempo foi adequado?',              hintLow: 'Mal usado',     hintHigh: 'Bem usado' },
};

type DimensionKey = EvaluationDimensionKey;

type ScoreState = Partial<Record<DimensionKey, number | null>>;

function buildFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    const screen = `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`;
    const lang = navigator.language || 'unknown';
    return `${tz}|${screen}|${lang}`.slice(0, 120);
  } catch {
    return 'fallback';
  }
}

const ScaleButton = memo(function ScaleButton({
  value,
  selected,
  onSelect,
  disabled,
}: {
  value: number;
  selected: boolean;
  onSelect: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(value)}
      aria-label={`Nota ${value}`}
      aria-pressed={selected}
      className={cn(
        'h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 text-base sm:text-lg font-semibold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        selected
          ? 'bg-primary text-primary-foreground border-primary scale-105'
          : 'bg-background text-foreground border-border hover:border-primary/60',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {value}
    </button>
  );
});

const DimensionRow = memo(function DimensionRow({
  dimensionKey,
  label,
  hintLow,
  hintHigh,
  value,
  onChange,
  disabled,
}: {
  dimensionKey: DimensionKey;
  label: string;
  hintLow: string;
  hintHigh: string;
  value: number | null;
  onChange: (key: DimensionKey, v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium leading-snug block">{label}</Label>
      <div className="flex justify-between gap-2">
        {SCALE.map((s) => (
          <ScaleButton
            key={s}
            value={s}
            selected={value === s}
            onSelect={(v) => onChange(dimensionKey, v)}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{hintLow}</span>
        <span>{hintHigh}</span>
      </div>
    </div>
  );
});

export default function PublicRitualEvaluation() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const formQuery = usePublicRitualEvaluationForm(shortCode ?? null);
  const submitMut = useSubmitRitualEvaluation();

  const form = formQuery.data;
  const dimensions = form?.dimensions ?? null;

  const [scores, setScores] = useState<ScoreState>({});
  const [changeOneThing, setChangeOneThing] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fingerprint = useMemo(buildFingerprint, []);

  const handleScoreChange = (key: DimensionKey, v: number) => {
    setScores((prev) => ({ ...prev, [key]: v }));
  };

  const allScored = !!dimensions && dimensions.every((k) => typeof scores[k] === 'number');
  const changeOneThingValid = changeOneThing.trim().length >= 3 && changeOneThing.trim().length <= 1000;
  const whatWorkedValid = whatWorked.length <= 1000;
  const canSubmit = allScored && changeOneThingValid && whatWorkedValid && !submitMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode || !canSubmit || !dimensions) return;
    try {
      await submitMut.mutateAsync({
        shortCode,
        scoreValue: scores.value as number,
        scoreQuality: dimensions.includes('quality') ? (scores.quality as number) : null,
        scoreDecisions: dimensions.includes('decisions') ? (scores.decisions as number) : null,
        scoreTime: scores.time as number,
        changeOneThing: changeOneThing.trim(),
        whatWorked: whatWorked.trim() || undefined,
        clientFingerprint: fingerprint,
      });
      setSubmitted(true);
    } catch {
      /* erro mostrado pelo bloco de status */
    }
  };

  // ── Estados de carregamento / erro / inválido ──
  if (formQuery.isLoading) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Carregando avaliação…</p>
        </div>
      </PublicShell>
    );
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <PublicShell>
        <Card>
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Não conseguimos encontrar essa avaliação. Confirme o link recebido com o condutor do rito.
            </p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  if (!form || !dimensions) return null;

  if (!form.isOpen) {
    return (
      <PublicShell>
        <Card>
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Avaliação encerrada</h1>
            <p className="text-sm text-muted-foreground">
              A coleta de avaliação para <strong>{form.ritualLabel}</strong> não está mais aberta.
            </p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell>
        <Card>
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h1 className="text-lg font-semibold">Obrigado!</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              Sua avaliação foi registrada de forma anônima e contribui para
              melhorar continuamente o <strong>{form.ritualLabel}</strong>.
            </p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  // ── Formulário ──
  return (
    <PublicShell>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg sm:text-xl">{form.ritualLabel}</CardTitle>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
            <span>
              <strong>Resposta anônima.</strong> Não registramos quem você é, seu IP ou
              o dispositivo. O condutor do rito vê apenas as médias e citações sem autoria.
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {dimensions.map((key) => {
              const meta = DIMENSION_META[key];
              return (
                <DimensionRow
                  key={key}
                  dimensionKey={key}
                  label={meta.label}
                  hintLow={meta.hintLow}
                  hintHigh={meta.hintHigh}
                  value={scores[key] ?? null}
                  onChange={handleScoreChange}
                  disabled={submitMut.isPending}
                />
              );
            })}

            <div className="space-y-2">
              <Label htmlFor="change-one-thing" className="text-base font-medium">
                Se pudesse mudar UMA coisa neste rito, qual seria?
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Textarea
                id="change-one-thing"
                value={changeOneThing}
                onChange={(e) => setChangeOneThing(e.target.value.slice(0, 1000))}
                placeholder="Seja direto. Ex.: 'Definir dono e prazo de cada decisão antes de fechar.'"
                rows={4}
                disabled={submitMut.isPending}
                required
                minLength={3}
                maxLength={1000}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {changeOneThing.length}/1000
              </div>
            </div>

            {form.showWhatWorked && (
              <div className="space-y-2">
                <Label htmlFor="what-worked" className="text-base font-medium">
                  O que funcionou e merece ser repetido? <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="what-worked"
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value.slice(0, 1000))}
                  placeholder="Ex.: 'A discussão sobre KR financeiro foi objetiva e gerou ação clara.'"
                  rows={3}
                  disabled={submitMut.isPending}
                  maxLength={1000}
                  className="resize-none"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {whatWorked.length}/1000
                </div>
              </div>
            )}

            {submitMut.isError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Não foi possível enviar sua avaliação. Tente novamente em alguns segundos.
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base"
              disabled={!canSubmit}
            >
              {submitMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando…
                </>
              ) : (
                'Enviar avaliação'
              )}
            </Button>

            {!allScored && (
              <p className="text-xs text-muted-foreground text-center">
                Responda {dimensions.length === 1 ? 'a pergunta' : `as ${dimensions.length} perguntas`} e o que você mudaria para enviar.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </PublicShell>
  );
}

const PublicShell = memo(function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-4 text-center">
          <h1 className="text-sm font-medium text-muted-foreground">Avaliação anônima do rito</h1>
        </header>
        {children}
        <footer className="mt-6 text-center text-[11px] text-muted-foreground">
          Feedback anônimo • Next da Jet
        </footer>
      </div>
    </main>
  );
});
