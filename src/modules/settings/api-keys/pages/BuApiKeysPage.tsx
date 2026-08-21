import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Activity, KeyRound, Plus, Ban } from 'lucide-react';
import { useBuApiKeys, useRevokeBuApiKey } from '../hooks/useBuApiKeys';
import { describeScopes } from '../scopes';
import { CreateApiKeyDialog } from '../components/CreateApiKeyDialog';
import { ApiKeyRevealDialog } from '../components/ApiKeyRevealDialog';
import { ApiKeyUsageDialog } from '../components/ApiKeyUsageDialog';
import { ApiDocsCard } from '../components/ApiDocsCard';
import type { BuApiKey, CreatedBuApiKey } from '../types';

function isExpired(key: BuApiKey) {
  return !!key.expires_at && new Date(key.expires_at) < new Date();
}

export default function BuApiKeysPage() {
  usePageTitle('Chaves de API', {
    customDescription: 'Gere e gerencie chaves de API para sistemas externos consumirem os dados desta BU.',
  });

  const { data: keys, isLoading } = useBuApiKeys();
  const revokeKey = useRevokeBuApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedBuApiKey | null>(null);
  const [usageKey, setUsageKey] = useState<BuApiKey | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<BuApiKey | null>(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/settings">
          <ArrowLeft className="h-4 w-4" />
          Configurações da BU
        </Link>
      </Button>

      <PageHeader
        title="Chaves de API"
        description="Permita que outros sistemas consumam os dados desta unidade de negócio com permissões por módulo."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova chave
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : !keys?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhuma chave criada</p>
              <p className="text-sm text-muted-foreground">
                Crie uma chave para liberar o acesso de um sistema externo.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova chave
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const revoked = key.status === 'revoked';
            const expired = isExpired(key);
            return (
              <Card key={key.id} className={revoked ? 'opacity-70' : undefined}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {key.name}
                        {revoked ? (
                          <Badge variant="secondary">Revogada</Badge>
                        ) : expired ? (
                          <Badge variant="secondary">Expirada</Badge>
                        ) : (
                          <Badge variant="outline">Ativa</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {key.consumer_system}
                        {key.description ? ` · ${key.description}` : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setUsageKey(key)}>
                        <Activity className="h-4 w-4" />
                        Uso
                      </Button>
                      {!revoked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setKeyToRevoke(key)}
                        >
                          <Ban className="h-4 w-4" />
                          Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-mono text-xs text-muted-foreground">
                    {key.key_prefix}••••••••
                  </p>
                  <p className="text-muted-foreground">{describeScopes(key.scopes)}</p>
                  <p className="text-xs text-muted-foreground">
                    Limite {key.rate_limit_per_minute} req/min · Criada em{' '}
                    {new Date(key.created_at).toLocaleDateString('pt-BR')}
                    {key.expires_at &&
                      ` · Expira em ${new Date(key.expires_at).toLocaleDateString('pt-BR')}`}
                    {key.last_used_at
                      ? ` · Último uso em ${new Date(key.last_used_at).toLocaleString('pt-BR')}`
                      : ' · Nunca usada'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ApiDocsCard />

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setCreatedKey}
      />
      <ApiKeyRevealDialog apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      <ApiKeyUsageDialog apiKey={usageKey} onClose={() => setUsageKey(null)} />

      <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar “{keyToRevoke?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O sistema que usa esta chave perde o acesso imediatamente. A ação não pode ser
              desfeita — será necessário gerar uma nova chave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!keyToRevoke) return;
                await revokeKey.mutateAsync(keyToRevoke.id);
                setKeyToRevoke(null);
              }}
            >
              Revogar chave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
