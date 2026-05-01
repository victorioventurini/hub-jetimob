/**
 * useKpiPrimaryDataEntry
 *
 * Convenção de UI: cada KPI tem 1 único contribuidor "data_entry" ativo
 * representando o usuário "Atualizado por" — separado do Responsável
 * (`owner_user_id`), que é o accountable pelo resultado.
 *
 * Persistência: tabela `kpi_data_contributors` com `role='data_entry'`.
 * Backfill inicial: copiado a partir de `owner_user_id` para KPIs ativos
 * que não tinham contribuidor (ver migration de backfill).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { kpisKeys } from '@/lib/queryKeys/okrs';

export interface PrimaryDataEntry {
  id: string;
  contributor_user_id: string;
  display_name: string | null;
  photo_url: string | null;
}

interface UpsertParams {
  kpiId: string;
  /** Se null/undefined, remove (soft-delete) qualquer data_entry ativo. */
  userId: string | null | undefined;
}

/**
 * Lê o contribuidor primário (data_entry) de um KPI — convenção de 1 ativo por KPI.
 */
export function useKpiPrimaryDataEntry(kpiId: string | null | undefined, enabled = true) {
  const { client, buId, isReady } = useOptionalBuClient();

  return useQuery({
    queryKey: kpisKeys.primaryDataEntry(kpiId ?? 'none'),
    enabled: isReady && !!kpiId && !!buId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PrimaryDataEntry | null> => {
      if (!client || !kpiId) return null;
      const { data, error } = await client
        .from('kpi_data_contributors')
        .select(
          `id, contributor_user_id,
           contributor:profiles!contributor_user_id(display_name, photo_url)`,
        )
        .eq('kpi_id', kpiId)
        .eq('role', 'data_entry')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useKpiPrimaryDataEntry] Fetch error:', error);
        throw error;
      }
      if (!data) return null;
      const contributor = (data as { contributor?: { display_name: string | null; photo_url: string | null } | null })
        .contributor;
      return {
        id: data.id,
        contributor_user_id: data.contributor_user_id,
        display_name: contributor?.display_name ?? null,
        photo_url: contributor?.photo_url ?? null,
      };
    },
  });
}

/**
 * Sincroniza o contribuidor primário (data_entry) de um KPI:
 * - Se userId for null/undefined → soft-delete dos data_entry ativos.
 * - Se já é o atual → no-op.
 * - Caso contrário → soft-delete dos antigos + insert do novo.
 *
 * Idempotente; respeita unique constraint `uq_kpi_contributor`.
 */
export function useUpsertKpiPrimaryDataEntry() {
  const { client, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kpiId, userId }: UpsertParams) => {
      if (!client || !buId) throw new Error('Client not ready');

      // Buscar data_entry atuais
      const { data: current, error: fetchErr } = await client
        .from('kpi_data_contributors')
        .select('id, contributor_user_id')
        .eq('kpi_id', kpiId)
        .eq('role', 'data_entry')
        .is('deleted_at', null);

      if (fetchErr) throw fetchErr;

      const currentList = current ?? [];
      const targetUserId = userId || null;

      // No-op: já é o único atual
      if (
        targetUserId &&
        currentList.length === 1 &&
        currentList[0].contributor_user_id === targetUserId
      ) {
        return { changed: false };
      }

      // Soft-delete os que não correspondem ao alvo (ou todos, se alvo for null)
      const idsToDelete = targetUserId
        ? currentList
            .filter((c) => c.contributor_user_id !== targetUserId)
            .map((c) => c.id)
        : currentList.map((c) => c.id);

      if (idsToDelete.length > 0) {
        const { error: delErr } = await client
          .from('kpi_data_contributors')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', idsToDelete);
        if (delErr) throw delErr;
      }

      // Inserir novo se não existir
      if (
        targetUserId &&
        !currentList.some((c) => c.contributor_user_id === targetUserId)
      ) {
        const { error: insErr } = await client
          .from('kpi_data_contributors')
          .insert({
            kpi_id: kpiId,
            contributor_user_id: targetUserId,
            role: 'data_entry',
            bu_id: buId,
          });
        if (insErr) throw insErr;
      }

      return { changed: true };
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: kpisKeys.contributors(vars.kpiId) });
      queryClient.invalidateQueries({ queryKey: kpisKeys.forWizard({}) });
    },
  });
}
