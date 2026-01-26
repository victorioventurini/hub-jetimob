/**
 * useInitiativeNameValidation
 * 
 * Hook para validação semântica do nome da iniciativa usando IA.
 * Detecta se o nome descreve uma ação (correto) ou um resultado (incorreto).
 * 
 * Usa o agente coach-okrs com debounce de 800ms.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { useVicAgent, useVicEnabled } from '@/modules/vic/hooks';

export type InitiativeNameFeedbackType = 'warning' | 'suggestion' | 'success';

export interface InitiativeNameFeedback {
  type: InitiativeNameFeedbackType;
  message: string;
  suggestion?: string;
}

interface UseInitiativeNameValidationOptions {
  /** Mínimo de caracteres para acionar validação */
  minLength?: number;
  /** Delay em ms para debounce */
  debounceMs?: number;
  /** Desabilitar validação */
  disabled?: boolean;
}

interface UseInitiativeNameValidationResult {
  /** Feedback da validação */
  feedback: InitiativeNameFeedback | null;
  /** Indica se está validando */
  isValidating: boolean;
  /** Reseta o feedback */
  reset: () => void;
}

const DEFAULT_OPTIONS: UseInitiativeNameValidationOptions = {
  minLength: 10,
  debounceMs: 800,
  disabled: false,
};

export function useInitiativeNameValidation(
  name: string,
  krTitle: string,
  options: UseInitiativeNameValidationOptions = {}
): UseInitiativeNameValidationResult {
  const { minLength, debounceMs, disabled } = { ...DEFAULT_OPTIONS, ...options };
  
  const [feedback, setFeedback] = useState<InitiativeNameFeedback | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const debouncedName = useDebouncedValue(name, debounceMs);
  const { isEnabled } = useVicEnabled();
  const { invoke } = useVicAgent();

  const reset = useCallback(() => {
    setFeedback(null);
    setIsValidating(false);
  }, []);

  useEffect(() => {
    // Não validar se desabilitado ou IA não está habilitada
    if (disabled || !isEnabled) {
      reset();
      return;
    }

    // Não validar se nome é muito curto
    if (!debouncedName || debouncedName.length < (minLength || 10)) {
      reset();
      return;
    }

    const validateName = async () => {
      setIsValidating(true);
      
      try {
        const userQuestion = `Avalie este nome de iniciativa: "${debouncedName}"
Contexto: Esta iniciativa está vinculada ao KR "${krTitle}"

Detecte:
1. Se parece um resultado/meta (ex: "Aumentar NPS para 72", "Reduzir churn em 20%") → type: "warning"
2. Se está vago demais (ex: "Melhorar processo", "Trabalhar no projeto") → type: "suggestion"
3. Se é uma ação concreta e clara (ex: "Implementar pesquisa de satisfação") → type: "success"

Responda APENAS com JSON válido, sem markdown:
{"type": "warning|suggestion|success", "message": "mensagem curta", "suggestion": "sugestão de reformulação se aplicável"}`;

        const response = await invoke(
          'validador-metodologico-okrs',
          'okr-initiative-review',
          {
            type: 'initiative-validation',
            title: krTitle,
            additionalData: { initiativeName: debouncedName },
          },
          userQuestion
        );

        if (response?.response) {
          try {
            // Tentar extrair JSON da resposta
            const jsonMatch = response.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as InitiativeNameFeedback;
              if (parsed.type && parsed.message) {
                setFeedback(parsed);
              }
            }
          } catch (parseError) {
            // Se não conseguir parsear, ignorar silenciosamente
            console.debug('[useInitiativeNameValidation] Failed to parse AI response');
          }
        }
      } catch (error) {
        // Validação falhou silenciosamente - não bloqueia o usuário
        console.debug('[useInitiativeNameValidation] Validation failed:', error);
      } finally {
        setIsValidating(false);
      }
    };

    validateName();
  }, [debouncedName, krTitle, minLength, disabled, isEnabled, invoke, reset]);

  return {
    feedback,
    isValidating,
    reset,
  };
}
