/**
 * AnalysisChatPage — CEO Copilot conversacional, BU-scoped, read-only.
 *
 * Rotas:
 *   /analysis/chat              -> cria nova thread e navega
 *   /analysis/chat/:threadId    -> carrega thread existente
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowUp,
  Brain,
  MessageSquarePlus,
  Trash2,
  Wrench,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useAnalysisMessages,
  useAnalysisThreads,
  useCreateAnalysisThread,
  useDeleteAnalysisThread,
  useSendAnalysisMessage,
  type AnalysisMessage,
} from "../hooks/useAnalysisChat";

const SUGGESTIONS = [
  "Quais KRs do Q2 estão off-track e por quê?",
  "Resuma a saúde dos KPIs comerciais nos últimos 90 dias com tendência.",
  "Quais projetos estão atrasados e que KRs eles impactam?",
  "Onde estão os principais riscos para fechar o ciclo atual?",
];

export default function AnalysisChatPage() {
  usePageTitle("Copiloto CEO");
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  const { data: threads = [] } = useAnalysisThreads();
  const createThread = useCreateAnalysisThread();
  const deleteThread = useDeleteAnalysisThread();
  const { data: messages = [], isLoading: loadingMessages } =
    useAnalysisMessages(threadId);
  const send = useSendAnalysisMessage();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, send.isPending]);

  const canSubmit = useMemo(
    () => input.trim().length >= 1 && !send.isPending && !createThread.isPending,
    [input, send.isPending, createThread.isPending],
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      // Lazily create a thread if we don't have one yet
      let tid = threadId;
      if (!tid) {
        tid = await createThread.mutateAsync(text.slice(0, 80));
        navigate(`/analysis/chat/${tid}`, { replace: true });
      }
      await send.mutateAsync({
        threadId: tid,
        history: messages,
        userText: text,
      });
    } catch (err) {
      // Restore input so user can retry
      setInput(text);
      console.error("[AnalysisChat] submit failed", err);
    }
  };

  const onSuggest = (text: string) => setInput(text);

  return (
    <HubLayout>
      <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
        <PageHeader
          title="Copiloto CEO"
          description="Converse com seus dados — OKRs, KPIs, projetos e rituais — em linguagem natural."
          breadcrumbs={[
            { label: "Análise Estratégica", href: "/analysis" },
            { label: "Copiloto" },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/analysis"><ArrowLeft className="mr-2 h-4 w-4" />Análises clássicas</Link>
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const id = await createThread.mutateAsync(undefined);
                  navigate(`/analysis/chat/${id}`);
                }}
                disabled={createThread.isPending}
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />Nova conversa
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Thread sidebar */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-1">
                  {threads.length === 0 && (
                    <p className="px-2 py-4 text-xs text-muted-foreground">
                      Sem conversas ainda.
                    </p>
                  )}
                  {threads.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                        t.id === threadId && "bg-accent",
                      )}
                    >
                      <button
                        type="button"
                        className="flex-1 truncate text-left"
                        onClick={() => navigate(`/analysis/chat/${t.id}`)}
                      >
                        <div className="truncate font-medium">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(t.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="opacity-0 transition group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Apagar esta conversa?")) {
                            deleteThread.mutate(t.id);
                            if (t.id === threadId) navigate("/analysis/chat");
                          }
                        }}
                        aria-label="Apagar conversa"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="flex flex-col h-[calc(100vh-180px)]">
            <CardContent className="flex-1 overflow-hidden p-0">
              <div
                ref={scrollRef}
                className="h-full overflow-y-auto px-4 py-6 md:px-8"
              >
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando conversa…
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState onPick={onSuggest} />
                ) : (
                  <div className="mx-auto max-w-3xl space-y-6">
                    {messages.map((m) => (
                      <Message key={m.id} message={m} />
                    ))}
                    {send.isPending && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analisando os dados…</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            {/* Composer */}
            <div className="border-t p-3 md:p-4">
              <div className="mx-auto max-w-3xl">
                <div className="relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pergunte sobre OKRs, KPIs, projetos, ciclos…"
                    className="min-h-[64px] resize-none pr-14"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit();
                      }
                    }}
                    disabled={send.isPending}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-2 right-2 h-9 w-9"
                    onClick={onSubmit}
                    disabled={!canSubmit}
                  >
                    {send.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Somente leitura • Dados isolados por BU • Modelo:
                  {" "}<span className="font-mono">gemini-2.5-pro</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </HubLayout>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Brain className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold">Copiloto do CEO</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pergunte qualquer coisa sobre a saúde da BU. Eu cruzo OKRs, KPIs,
        projetos e check-ins por você.
      </p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border bg-card p-3 text-left text-sm transition hover:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ message }: { message: AnalysisMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-foreground",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-table:my-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || "_(resposta vazia)_"}
              </ReactMarkdown>
            </div>
            {message.tool_trace && message.tool_trace.length > 0 && (
              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem value="tools" className="border-none">
                  <AccordionTrigger className="py-1 text-[11px] text-muted-foreground hover:no-underline">
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {message.tool_trace.length} consulta(s) executada(s)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 text-[11px]">
                      {message.tool_trace.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1"
                        >
                          <span className="font-mono">{t.name}</span>
                          <Badge variant={t.ok ? "secondary" : "destructive"}>
                            {t.ok ? `${t.ms}ms` : "erro"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
}
