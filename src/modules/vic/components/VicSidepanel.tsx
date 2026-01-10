import { useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVic } from "../contexts/VicContext";
import { useVicStream } from "../hooks/useVicStream";
import { VicLoadingState } from "./VicLoadingState";
import { toast } from "sonner";

export function VicSidepanel() {
  const { panelState, closePanel, setResponse, setLoading, getAgentInfo } = useVic();
  const { stream, cancel, reset, isStreaming, response, metadata } = useVicStream();
  const [userQuestion, setUserQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  const agentInfo = panelState.agentSlug ? getAgentInfo(panelState.agentSlug) : null;

  // Auto-generate on open if no question needed
  useEffect(() => {
    if (panelState.isOpen && panelState.agentSlug && panelState.context && !response) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelState.isOpen]);

  // Sync loading state
  useEffect(() => {
    setLoading(isStreaming);
  }, [isStreaming, setLoading]);

  // Sync response to context
  useEffect(() => {
    if (response && metadata) {
      setResponse({
        response,
        agentName: metadata.agentName,
        agentSlug: metadata.agentSlug,
        tokensUsed: metadata.tokensUsed,
        latencyMs: metadata.latencyMs,
      });
    }
  }, [response, metadata, setResponse]);

  const handleGenerate = useCallback(async () => {
    if (!panelState.agentSlug || !panelState.actionContext || !panelState.context) {
      return;
    }

    try {
      await stream(
        panelState.agentSlug,
        panelState.actionContext,
        panelState.context,
        userQuestion || undefined
      );
    } catch {
      // Error handled in hook
    }
  }, [panelState, userQuestion, stream]);

  const handleStop = () => {
    cancel();
  };

  const handleRegenerate = () => {
    reset();
    handleGenerate();
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (response && panelState.onApply) {
      panelState.onApply(response);
      toast.success("Aplicado!");
      closePanel();
    }
  };

  const handleClose = () => {
    reset();
    setUserQuestion("");
    setCopied(false);
    closePanel();
  };

  return (
    <Sheet open={panelState.isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">
                {agentInfo?.name || "Vic"}
              </SheetTitle>
              <SheetDescription className="text-left text-xs">
                {agentInfo?.description}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {/* Context Summary */}
          {panelState.context && (
            <div className="flex-shrink-0 mb-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Contexto
                </p>
                <p className="text-sm font-medium">
                  {panelState.context.title || panelState.context.type}
                </p>
                {panelState.context.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {panelState.context.description}
                  </p>
                )}
                {panelState.context.currentValue !== undefined && (
                  <div className="flex gap-4 mt-2 text-xs">
                    <span>
                      Atual: <strong>{panelState.context.currentValue}{panelState.context.unit}</strong>
                    </span>
                    {panelState.context.targetValue !== undefined && (
                      <span>
                        Meta: <strong>{panelState.context.targetValue}{panelState.context.unit}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Question Input */}
          <div className="flex-shrink-0 mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Pergunta (opcional)
            </label>
            <Textarea
              placeholder="Ex: Como posso melhorar este objetivo?"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              className="resize-none h-20"
              disabled={isStreaming}
            />
            {!response && !isStreaming && (
              <Button
                onClick={handleGenerate}
                disabled={isStreaming}
                className="w-full mt-2 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar
              </Button>
            )}
            {isStreaming && (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="w-full mt-2 gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Parar
              </Button>
            )}
          </div>

          <Separator className="flex-shrink-0" />

          {/* Response Area */}
          <div className="flex-1 min-h-0 mt-4">
            {isStreaming && !response ? (
              <VicLoadingState 
                text="Vic está pensando..." 
                size="lg" 
                className="h-full" 
              />
            ) : response ? (
              <ScrollArea className="h-full">
                <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {response}
                    {isStreaming && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle rounded-full"
                      />
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Clique em &quot;Gerar&quot; para consultar o Vic</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {response && !isStreaming && (
            <div className="flex-shrink-0 mt-4 pt-4 border-t">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isStreaming}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isStreaming && "animate-spin")} />
                    Refazer
                  </Button>
                </div>
                {panelState.onApply && (
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className="gap-1.5"
                  >
                    Aplicar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {metadata?.tokensUsed && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {metadata.tokensUsed} tokens • {metadata.latencyMs}ms
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
