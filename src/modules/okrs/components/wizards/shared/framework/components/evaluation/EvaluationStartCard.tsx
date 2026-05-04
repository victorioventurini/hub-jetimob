/**
 * EvaluationStartCard — botão "Abrir avaliação" + QR + URL curta
 * Apresentacional puro (recebe shortCode quando já aberto, ou onOpen).
 */
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface EvaluationStartCardProps {
  shortCode: string | null;
  publicBaseUrl: string;
  isOpening: boolean;
  isClosing: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function EvaluationStartCard({
  shortCode,
  publicBaseUrl,
  isOpening,
  isClosing,
  onOpen,
  onClose,
}: EvaluationStartCardProps) {
  const url = shortCode ? `${publicBaseUrl}/p/r/${shortCode}` : null;

  if (!shortCode) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <QrCode className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Coletar avaliação anônima</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Cada participante responde no próprio celular. Ninguém vê a resposta de ninguém.
            </p>
          </div>
          <Button onClick={onOpen} disabled={isOpening} size="lg">
            {isOpening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir avaliação
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <QRCodeSVG value={url ?? ''} size={220} level="M" includeMargin={false} />
        </div>

        <div className="w-full max-w-md space-y-2">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Ou digite no navegador
            </div>
            <div className="text-2xl font-semibold tracking-widest mt-1">
              {publicBaseUrl.replace(/^https?:\/\//, '')}/p/r/<span className="text-primary">{shortCode}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input value={url ?? ''} readOnly className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (!url) return;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado');
              }}
              aria-label="Copiar link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
              aria-label="Abrir link"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button variant="secondary" onClick={onClose} disabled={isClosing}>
          {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Encerrar coleta e ver agregado
        </Button>
      </CardContent>
    </Card>
  );
}
