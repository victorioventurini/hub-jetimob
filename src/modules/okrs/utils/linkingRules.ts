/**
 * OKR Linking Rules — Business Logic
 * Based on TCR v1.6.0 methodology
 */

export type LinkingEntityLevel = 'org' | 'team' | 'user';
export type LinkingEntityType = 'objective' | 'kr';

export interface LinkingValidation {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  warningMessage?: string;
}

/**
 * Validate Objective → Objective linking rules
 * 
 * ✅ Allowed: Team Objective → Org Objective
 * ❌ Forbidden: Org Objective → Team Objective
 * ❌ Forbidden: Objective → Objective at same level (prevents loops)
 */
export function validateObjectiveToObjective(
  fromLevel: LinkingEntityLevel,
  toLevel: LinkingEntityLevel
): LinkingValidation {
  // Org → Team: forbidden (wrong direction)
  if (fromLevel === 'org' && toLevel === 'team') {
    return {
      isValid: false,
      errorCode: 'WRONG_DIRECTION',
      errorMessage: 'Objetivos organizacionais não podem se vincular a objetivos de time. A direção correta é: Time → Organização.',
    };
  }

  // Same level: forbidden (prevents loops)
  if (fromLevel === toLevel) {
    return {
      isValid: false,
      errorCode: 'SAME_LEVEL',
      errorMessage: 'Objetivos do mesmo nível não podem se vincular entre si. Isso evita ciclos e mantém a hierarquia clara.',
    };
  }

  // Team → Org: allowed
  if (fromLevel === 'team' && toLevel === 'org') {
    return { isValid: true };
  }

  return { isValid: true };
}

/**
 * Validate KR → Objective linking rules
 * 
 * ✅ Allowed: Team KR → Org Objective (informational)
 * ❌ Forbidden: KR → Objective from different team without formal relationship
 * ❌ Forbidden: KR → User Objective
 */
export function validateKrToObjective(
  krLevel: LinkingEntityLevel,
  krTeamId: string | null,
  objectiveLevel: LinkingEntityLevel,
  objectiveTeamId: string | null
): LinkingValidation {
  // KR → User Objective: forbidden
  if (objectiveLevel === 'user') {
    return {
      isValid: false,
      errorCode: 'KR_TO_USER_OBJECTIVE',
      errorMessage: 'KRs não podem se vincular a objetivos de usuário.',
    };
  }

  // Team KR → Org Objective: allowed (informational)
  if (krLevel === 'team' && objectiveLevel === 'org') {
    return { isValid: true };
  }

  // Team KR → Team Objective from different team: warning
  if (krLevel === 'team' && objectiveLevel === 'team' && krTeamId !== objectiveTeamId) {
    return {
      isValid: true,
      warningMessage: 'Atenção: Este KR está sendo vinculado a um objetivo de outro time. Certifique-se de que há uma relação formal entre os times.',
    };
  }

  return { isValid: true };
}

export type KrType = 'contribution' | 'enabler' | 'foundational';

/**
 * Validate KR → KR linking rules
 * 
 * ✅ Allowed: Team KR (type=contribution) → Org KR
 * ❌ Forbidden: Team KR (type=foundational or enabler) → Org KR
 * ❌ Forbidden: KR → KR at same hierarchical level
 * ❌ Forbidden: Any link that creates a cycle
 */
export function validateKrToKr(
  fromKrType: KrType,
  fromLevel: LinkingEntityLevel,
  toLevel: LinkingEntityLevel
): LinkingValidation {
  // Same level: forbidden (prevents loops)
  if (fromLevel === toLevel) {
    return {
      isValid: false,
      errorCode: 'SAME_LEVEL_KR',
      errorMessage: 'KRs do mesmo nível hierárquico não podem se vincular entre si. Isso evita ciclos e mantém a estrutura clara.',
    };
  }

  // Team KR → Org KR: only allowed for type=contribution
  if (fromLevel === 'team' && toLevel === 'org') {
    if (fromKrType === 'foundational') {
      return {
        isValid: false,
        errorCode: 'FOUNDATIONAL_TO_ORG',
        errorMessage: 'KRs fundacionais representam pré-requisitos internos do time e não podem contribuir diretamente para KRs organizacionais.',
      };
    }
    if (fromKrType === 'enabler') {
      return {
        isValid: false,
        errorCode: 'ENABLER_TO_ORG',
        errorMessage: 'KRs habilitadores apoiam outros KRs do time e não podem contribuir diretamente para KRs organizacionais.',
      };
    }
    // contribution type: allowed
    return { isValid: true };
  }

  // Org → Team: wrong direction
  if (fromLevel === 'org' && toLevel === 'team') {
    return {
      isValid: false,
      errorCode: 'WRONG_DIRECTION_KR',
      errorMessage: 'KRs organizacionais não contribuem para KRs de time. A direção correta é: Time → Organização.',
    };
  }

  return { isValid: true };
}

/**
 * OKR Limits — Cognitive Load Rules
 * Based on best practices to maintain focus
 */
export const OKR_LIMITS = {
  MAX_OBJECTIVES_PER_TEAM: 3,
  MAX_KRS_PER_OBJECTIVE: 3,
  MAX_CONTRIBUTIONS_PER_KR: 3,
} as const;

export interface LimitValidation {
  isWithinLimit: boolean;
  currentCount: number;
  maxCount: number;
  warningMessage?: string;
  educationalMessage: string;
}

export function validateObjectivesLimit(currentCount: number): LimitValidation {
  const maxCount = OKR_LIMITS.MAX_OBJECTIVES_PER_TEAM;
  const isWithinLimit = currentCount < maxCount;

  return {
    isWithinLimit,
    currentCount,
    maxCount,
    warningMessage: !isWithinLimit 
      ? `Limite atingido: ${currentCount}/${maxCount} objetivos` 
      : undefined,
    educationalMessage: `A metodologia OKR recomenda máximo ${maxCount} objetivos por time para manter o foco. Muitos objetivos dispersam esforços e reduzem a chance de alcançar resultados significativos.`,
  };
}

export function validateKrsLimit(currentCount: number): LimitValidation {
  const maxCount = OKR_LIMITS.MAX_KRS_PER_OBJECTIVE;
  const isWithinLimit = currentCount < maxCount;

  return {
    isWithinLimit,
    currentCount,
    maxCount,
    warningMessage: !isWithinLimit 
      ? `Limite atingido: ${currentCount}/${maxCount} KRs` 
      : undefined,
    educationalMessage: `Cada objetivo deve ter no máximo ${maxCount} Key Results. Mais KRs indicam que o objetivo pode estar amplo demais e deveria ser dividido.`,
  };
}

export function validateContributionsLimit(currentCount: number): LimitValidation {
  const maxCount = OKR_LIMITS.MAX_CONTRIBUTIONS_PER_KR;
  const isWithinLimit = currentCount < maxCount;

  return {
    isWithinLimit,
    currentCount,
    maxCount,
    warningMessage: !isWithinLimit 
      ? `Limite atingido: ${currentCount}/${maxCount} contribuições` 
      : undefined,
    educationalMessage: `Cada KR deve contribuir para no máximo ${maxCount} entidades de nível superior. Muitas contribuições indicam falta de priorização.`,
  };
}

/**
 * Get user-friendly explanation for KR types
 */
export function getKrTypeExplanation(type: KrType): string {
  switch (type) {
    case 'contribution':
      return 'Contribui diretamente para um KR organizacional. O progresso deste KR impacta a métrica da organização.';
    case 'enabler':
      return 'Habilita outros KRs do time. É um passo necessário para que outros resultados sejam alcançados.';
    case 'foundational':
      return 'Representa um pré-requisito ou fundação. Sem ele, o time não consegue avançar em outras frentes.';
  }
}

/**
 * Get user-friendly explanation for why a link is/isn't allowed
 */
export function getLinkingRuleExplanation(
  fromType: LinkingEntityType,
  toType: LinkingEntityType,
  fromLevel: LinkingEntityLevel,
  toLevel: LinkingEntityLevel
): string {
  if (fromType === 'objective' && toType === 'objective') {
    if (fromLevel === 'team' && toLevel === 'org') {
      return 'Objetivos de time podem se vincular a objetivos organizacionais para mostrar alinhamento estratégico.';
    }
    return 'A hierarquia de objetivos segue: Time → Organização. Vínculos no sentido contrário ou no mesmo nível não são permitidos.';
  }

  if (fromType === 'kr' && toType === 'kr') {
    if (fromLevel === 'team' && toLevel === 'org') {
      return 'KRs de time tipo "contribuição" podem se vincular a KRs organizacionais. KRs habilitadores e fundacionais são internos ao time.';
    }
    return 'A hierarquia de KRs segue: Time → Organização. Vínculos entre KRs do mesmo nível criam ciclos e devem ser evitados.';
  }

  return 'As regras de vínculo garantem uma hierarquia clara e evitam dependências circulares.';
}
