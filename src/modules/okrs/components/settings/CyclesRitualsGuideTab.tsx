import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Lightbulb,
  PlayCircle,
  RefreshCw,
  Settings2,
  Users,
  Zap,
  XCircle,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CyclesRitualsGuideTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Guia: Ciclos e Rituais</h2>
        <p className="text-sm text-muted-foreground">
          Entenda como funcionam os ciclos de OKR, a transição automática e a relação com os rituais de gestão
        </p>
      </div>

      {/* 1. Ciclo de vida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-5 w-5 text-primary" />
            Ciclo de Vida dos Ciclos
          </CardTitle>
          <CardDescription>
            Todo ciclo de OKR passa por três estados sequenciais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* State diagram */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-lg border bg-muted/30">
            <div className="flex flex-col items-center gap-1">
              <Badge className="bg-status-blue-muted text-status-blue border-status-blue/30 border">
                Planejamento
              </Badge>
              <span className="text-[11px] text-muted-foreground">planning</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-center gap-1">
              <Badge className="bg-status-green-muted text-status-green border-status-green/30 border">
                Em execução
              </Badge>
              <span className="text-[11px] text-muted-foreground">active</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-center gap-1">
              <Badge className="bg-muted text-muted-foreground border">
                Encerrado
              </Badge>
              <span className="text-[11px] text-muted-foreground">closed</span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0 mt-0.5 bg-status-blue-muted text-status-blue border-status-blue/30">
                Planejamento
              </Badge>
              <p className="text-muted-foreground">
                O ciclo foi criado mas ainda não começou. Use este estado para preparar ciclos futuros com antecedência.
                Rituais <strong>não ficam disponíveis</strong> neste estado.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0 mt-0.5 bg-status-green-muted text-status-green border-status-green/30">
                Em execução
              </Badge>
              <p className="text-muted-foreground">
                O ciclo está ativo. Check-ins, dashboards e <strong>todos os rituais</strong> passam a funcionar com base neste ciclo.
                Apenas um ciclo por tipo pode estar ativo por vez na mesma Business Unit.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0 mt-0.5">
                Encerrado
              </Badge>
              <p className="text-muted-foreground">
                O ciclo foi concluído. Os dados ficam preservados para consulta histórica, mas nenhum ritual novo pode ser executado neste contexto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Transição automática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-warning" />
            Transição Automática de Ciclos
          </CardTitle>
          <CardDescription>
            Ative o toggle para que ciclos transicionem sem intervenção manual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Settings2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Como ativar</p>
                <p className="text-muted-foreground">
                  Na aba <strong>Ciclos</strong>, habilite o toggle <em>"Transição automática de ciclos"</em>.
                  A configuração é <strong>opt-in</strong> — começa desligada por padrão.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Quando acontece</p>
                <p className="text-muted-foreground">
                  O sistema verifica automaticamente a cada minuto. Quando a <strong>data de início</strong> de um ciclo em <em>Planejamento</em> é
                  alcançada, ele é ativado (e o ciclo ativo anterior do mesmo tipo é encerrado). Ciclos ativos cuja
                  <strong> data final</strong> já passou são encerrados automaticamente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-status-green mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Resultado</p>
                <p className="text-muted-foreground">
                  Basta criar os ciclos com antecedência em <em>Planejamento</em> — o sistema cuida do resto.
                  Não é necessário lembrar de ativar ou encerrar manualmente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Rituais e disponibilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Rituais de Gestão
          </CardTitle>
          <CardDescription>
            Rituais só ficam disponíveis quando existe um ciclo ativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ritual</TableHead>
                  <TableHead>Frequência sugerida</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Pré-requisito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Colaborador", freq: "Semanal", who: "Cada colaborador", req: "Ciclo ativo" },
                  { name: "Líder (Prep)", freq: "Semanal", who: "Líder do time", req: "Ciclo ativo" },
                  { name: "Time", freq: "Semanal", who: "Todo o time", req: "Ciclo ativo" },
                  { name: "Gestores", freq: "Quinzenal/Mensal", who: "Líderes + Gestão", req: "Ciclo ativo" },
                  { name: "C-Level", freq: "Mensal", who: "Diretoria executiva", req: "Ciclo ativo" },
                  { name: "MBR", freq: "Mensal", who: "Executivos + BU Admin", req: "Ciclo ativo" },
                ].map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.freq}</TableCell>
                    <TableCell className="text-muted-foreground">{r.who}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-status-green-muted text-status-green border-status-green/30 text-xs">
                        {r.req}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Quando o ciclo é ativado (manual ou automaticamente), todos os rituais ficam imediatamente disponíveis.
              Ao encerrar o ciclo, novos rituais não podem mais ser iniciados naquele contexto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. QBR — Fluxo especial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-5 w-5 text-primary" />
            QBR — Fluxo Especial
          </CardTitle>
          <CardDescription>
            O Quarterly Business Review possui uma máquina de estados própria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QBR state machine */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-4 rounded-lg border bg-muted/30">
            {[
              { label: "Fechado", sub: "closed", color: "bg-muted text-muted-foreground" },
              { label: "Aberto", sub: "open", color: "bg-status-blue-muted text-status-blue border-status-blue/30" },
              { label: "Coletando", sub: "collecting", color: "bg-status-yellow-muted text-status-yellow border-status-yellow/30" },
              { label: "Revisando", sub: "reviewing", color: "bg-status-purple-muted text-status-purple border-status-purple/30" },
              { label: "Pronto", sub: "ready", color: "bg-status-green-muted text-status-green border-status-green/30" },
              { label: "Concluído", sub: "done", color: "bg-muted text-muted-foreground" },
            ].map((s, i, arr) => (
              <div key={s.sub} className="flex items-center gap-1.5">
                <div className="flex flex-col items-center gap-0.5">
                  <Badge className={`${s.color} border text-xs`}>{s.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">{s.sub}</span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                A abertura do QBR é <strong>sempre manual</strong> — um administrador precisa abrir o rito na aba Rituais das configurações.
                Isso garante que a liderança controle o momento de início da revisão trimestral.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                No estágio <em>Pre</em>, líderes propõem OKRs para o próximo ciclo. Os dados são promovidos
                atomicamente no estágio <em>Post</em>, garantindo integridade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Fluxo recomendado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Fluxo Recomendado
          </CardTitle>
          <CardDescription>
            Passo a passo para configurar e operar ciclos e rituais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Crie os ciclos com antecedência",
                desc: "Na aba Ciclos, crie os ciclos do ano (ex: Q1, Q2, Q3, Q4) com status \"Planejamento\". Defina as datas de início e fim de cada um.",
              },
              {
                step: "2",
                title: "Ative a transição automática (opcional)",
                desc: "Habilite o toggle de auto-gestão para que os ciclos sejam ativados e encerrados automaticamente nas datas configuradas.",
              },
              {
                step: "3",
                title: "Rituais ficam disponíveis",
                desc: "Quando o ciclo entra em \"Em execução\", todos os rituais de gestão passam a funcionar automaticamente. Configure cadências na aba Rituais.",
              },
              {
                step: "4",
                title: "Execute os rituais durante o ciclo",
                desc: "Colaboradores, líderes e gestores executam seus rituais nas frequências configuradas. O calendário mostra a aderência de cada time.",
              },
              {
                step: "5",
                title: "Abra o QBR (quando aplicável)",
                desc: "Próximo ao fim do ciclo, abra manualmente o rito de QBR na aba Rituais. Líderes propõem OKRs, C-Level revisa, e os dados são promovidos.",
              },
              {
                step: "6",
                title: "Ciclo encerra, próximo ativa",
                desc: "Com a transição automática, o novo ciclo é ativado na data de início e o anterior é encerrado. Sem ela, faça a transição manualmente.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6. Dicas */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" />
            Dicas e Boas Práticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <span>Crie todos os ciclos do ano de uma vez em <em>Planejamento</em> — assim a transição automática cuida de tudo.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <span>Não sobreponha datas de ciclos do mesmo tipo. O sistema impede dois ciclos ativos simultâneos.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <span>Use o Calendário de Rituais para acompanhar a aderência dos times às cadências planejadas.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <span>O MBR consolida as decisões do mês — execute-o mensalmente para manter o acompanhamento estratégico.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
              <span>Abra o QBR com 2–3 semanas de antecedência do fim do ciclo para dar tempo aos líderes de prepararem propostas.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
