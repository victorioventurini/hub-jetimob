import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBuScope } from '@/hooks/useBuScope';
import { buApiKeysKeys } from '@/lib/queryKeys/bu';
import { toast } from 'sonner';
import type {
  BuApiKey,
  BuApiKeyUsageLog,
  CreateBuApiKeyInput,
  CreatedBuApiKey,
} from '../types';

const KEY_FIELDS =
  'id, bu_id, name, description, consumer_system, key_prefix, scopes, rate_limit_per_minute, status, expires_at, last_used_at, created_by, revoked_at, created_at, updated_at';

const LOG_FIELDS =
  'id, api_key_id, method, route, status_code, latency_ms, ip_address, error_message, created_at';

export function useBuApiKeys() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBuScope();

  return useQuery({
    queryKey: buApiKeysKeys.list(currentBuId),
    enabled: !!currentBuId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bu_api_keys')
        .select(KEY_FIELDS)
        .eq('bu_id', currentBuId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BuApiKey[];
    },
  });
}

export function useBuApiKeyUsage(apiKeyId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBuScope();

  return useQuery({
    queryKey: buApiKeysKeys.usage(currentBuId, apiKeyId),
    enabled: !!currentBuId && !!apiKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bu_api_key_usage_logs')
        .select(LOG_FIELDS)
        .eq('api_key_id', apiKeyId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as BuApiKeyUsageLog[];
    },
  });
}

async function invokeManage<T>(
  supabase: ReturnType<typeof useBuScopedSupabase>,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bu-api-keys', { body });
  if (error) {
    let details = error.message;
    const context = (error as { context?: { text?: () => Promise<string> } }).context;
    if (context?.text) {
      const raw = await context.text().catch(() => '');
      try {
        const parsed = JSON.parse(raw);
        details = parsed?.error?.message ?? raw ?? details;
      } catch {
        details = raw || details;
      }
    }
    throw new Error(details);
  }
  const payload = data as { data?: T; error?: { message?: string } };
  if (payload?.error) throw new Error(payload.error.message ?? 'Falha na operação.');
  return payload.data as T;
}

export function useCreateBuApiKey() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBuScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBuApiKeyInput) =>
      invokeManage<CreatedBuApiKey>(supabase, {
        action: 'create',
        bu_id: currentBuId,
        ...input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buApiKeysKeys.list(currentBuId) });
    },
    onError: (error: Error) => {
      toast.error('Não foi possível criar a chave', { description: error.message });
    },
  });
}

export function useUpdateBuApiKey() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBuScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      keyId,
      ...patch
    }: { keyId: string } & Partial<CreateBuApiKeyInput>) =>
      invokeManage<BuApiKey>(supabase, {
        action: 'update',
        bu_id: currentBuId,
        key_id: keyId,
        ...patch,
      }),
    onSuccess: () => {
      toast.success('Chave atualizada');
      queryClient.invalidateQueries({ queryKey: buApiKeysKeys.list(currentBuId) });
    },
    onError: (error: Error) => {
      toast.error('Não foi possível atualizar a chave', { description: error.message });
    },
  });
}

export function useRevokeBuApiKey() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBuScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) =>
      invokeManage<{ id: string; status: string }>(supabase, {
        action: 'revoke',
        bu_id: currentBuId,
        key_id: keyId,
      }),
    onSuccess: () => {
      toast.success('Chave revogada');
      queryClient.invalidateQueries({ queryKey: buApiKeysKeys.list(currentBuId) });
    },
    onError: (error: Error) => {
      toast.error('Não foi possível revogar a chave', { description: error.message });
    },
  });
}
