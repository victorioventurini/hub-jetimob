/**
 * RitualGreeting — Saudação contextual usada no Step 1 de todos os ritos
 * (exceto wizards de criação de OKRs).
 *
 * - Saudação por período do dia (Bom dia / Boa tarde / Boa noite)
 * - Frase contextual por rito (SSOT em `ritualLabels.RITUAL_GREETING_PHRASES`)
 * - Linha de badges contextuais conforme cadência (weekly/monthly/quarterly)
 *
 * Componente puramente apresentacional: não busca dados, não tem CTAs.
 * O cálculo de badges fica no hook `useRitualGreetingContext`.
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getRitualGreetingConfig,
  type RitualCadence,
} from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

// ============================================================
// HELPERS
// ============================================================

function getPeriodGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function firstName(userName: string | null | undefined): string {
  if (!userName) return 'Você';
  const trimmed = userName.trim();
  if (!trimmed) return 'Você';
  return trimmed.split(/\s+/)[0];
}

// ============================================================
// TYPES
// ============================================================

export interface RitualGreetingProps {
  /** Persona do rito (slug canônico). Se não tiver entrada em
   *  RITUAL_GREETING_PHRASES, o componente não renderiza nada. */
  ritualSlug: WizardPersona;
  /** Nome do usuário (será reduzido ao primeiro nome). */
  userName: string | null | undefined;
  /**
   * Quando informado, sobrepõe `userName` apenas para a saudação (continua
   * aplicando `firstName()`). Útil quando o nome do destinatário da saudação
   * é diferente do contexto do rito (ex.: pré-MBR usa o nome do **líder do
   * time**, não o nome do usuário corrente).
   */
  displayName?: string | null;
  /**
   * Variáveis para interpolação na frase. Cada `{key}` em
   * `RITUAL_GREETING_PHRASES[ritualSlug].phrase` é substituído pelo valor
   * correspondente. Chaves ausentes viram string vazia (espaços duplos
   * resultantes são colapsados).
   */
  phraseVars?: Record<string, string | null | undefined>;
  /** Nome do ciclo ativo (ex.: "Q2 2026"). Usado em weekly/monthly. */
  cycleName?: string | null;
  /** Override de cadência (caso a página queira forçar diferente do SSOT). */
  cadence?: RitualCadence;

  // Weekly badges
  weekNumber?: number | null;
  /** 1 = primeiro check-in. null/undefined => "Primeiro check-in do ciclo" */
  checkInOrdinal?: number | null;

  // Monthly badges
  monthLabel?: string | null;          // ex.: "Abril 2026"
  monthInQuarter?: 1 | 2 | 3 | null;   // ex.: 1, 2, 3

  // Quarterly badges
  closingCycleName?: string | null;    // ex.: "Q1 2026"
  openingCycleName?: string | null;    // ex.: "Q2 2026"

  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const ORDINAL_PT: Record<number, string> = {
  1: '1º', 2: '2º', 3: '3º', 4: '4º', 5: '5º', 6: '6º', 7: '7º', 8: '8º',
  9: '9º', 10: '10º', 11: '11º', 12: '12º', 13: '13º',
};

function ordinalLabel(n: number): string {
  return ORDINAL_PT[n] ?? `${n}º`;
}

function buildBadges(props: RitualGreetingProps, cadence: RitualCadence): string[] {
  const badges: string[] = [];

  if (cadence === 'weekly') {
    if (props.weekNumber) badges.push(`Semana ${props.weekNumber}`);
    if (props.cycleName) badges.push(props.cycleName);
    if (props.checkInOrdinal && props.checkInOrdinal > 0) {
      badges.push(`Seu ${ordinalLabel(props.checkInOrdinal)} check-in neste ciclo`);
    } else {
      badges.push('Primeiro check-in do ciclo');
    }
  } else if (cadence === 'monthly') {
    if (props.monthLabel) badges.push(props.monthLabel);
    if (props.cycleName) badges.push(props.cycleName);
    if (props.monthInQuarter) badges.push(`Mês ${props.monthInQuarter} do quarter`);
  } else if (cadence === 'quarterly') {
    if (props.closingCycleName && props.openingCycleName) {
      badges.push(`${props.closingCycleName} → ${props.openingCycleName}`);
    } else if (props.cycleName) {
      badges.push(props.cycleName);
    }
  }

  return badges;
}

function interpolatePhrase(
  template: string,
  vars: Record<string, string | null | undefined> | undefined,
): string {
  if (!vars) return template;
  const replaced = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
  // Colapsa espaços duplos resultantes de placeholders vazios
  return replaced.replace(/\s{2,}/g, ' ').trim();
}

function RitualGreetingImpl(props: RitualGreetingProps) {
  const config = getRitualGreetingConfig(props.ritualSlug);
  if (!config) return null;

  const cadence = props.cadence ?? config.cadence;
  const period = getPeriodGreeting();
  const nameSource = props.displayName ?? props.userName;
  const name = firstName(nameSource);
  const phrase = interpolatePhrase(config.phrase, props.phraseVars);
  const badges = buildBadges(props, cadence);

  return (
    <div
      className={cn(
        'px-6 py-5 border-b bg-gradient-to-r from-primary/5 to-transparent',
        props.className,
      )}
    >
      <h2 className="text-xl font-semibold tracking-tight">
        {period}, {name}. <span className="text-muted-foreground font-normal">{phrase}</span>
      </h2>
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {badges.map((b, i) => (
            <Badge key={`${b}-${i}`} variant="outline" className="font-normal text-xs">
              {b}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export const RitualGreeting = memo(RitualGreetingImpl);
