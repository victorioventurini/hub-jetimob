
# Correção de Aniversários + Destaque para Aniversariantes do Dia

## Problema 1: Bug na comparacao de datas

O hook `useBirthdays()` em `src/hooks/useHomeData.ts` (linha 142) compara a data do aniversario (meia-noite) com `new Date()` (que inclui hora atual). Quando o aniversario e **hoje**, `birthdayThisYear` (00:00:00) e menor que `today` (ex: 14:30:00), fazendo o codigo pular para o proximo ano e calcular `daysUntil = ~365`, excluindo o aniversariante da lista.

**Correcao**: normalizar `today` para meia-noite antes da comparacao.

## Problema 2: Destaque para aniversariantes do dia

Criar um componente de destaque (banner/card) que apareca no topo do dashboard quando houver aniversariantes no dia, com visual celebrativo.

---

## Plano de implementacao

### 1. Corrigir bug de data em `useHomeData.ts`

Normalizar a variavel `today` para meia-noite (zerando horas, minutos, segundos) no hook `useBirthdays()`:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0); // Normalizar para meia-noite
```

Mesma correcao sera aplicada em `useWorkAnniversaries()` para consistencia.

### 2. Expor aniversariantes do dia no hook

Adicionar ao retorno do `useBirthdays()` uma lista derivada `todayBirthdays` (filtro `daysUntil === 0`) para facilitar o consumo pelo componente de destaque.

Alternativa mais limpa: o componente de destaque consumira o mesmo hook e filtrara localmente.

### 3. Criar componente `BirthdayTodayBanner`

Novo arquivo: `src/components/home/BirthdayTodayBanner.tsx`

- Consome `useBirthdays()` e filtra `daysUntil === 0`
- Se nao houver aniversariantes hoje, retorna `null` (nao renderiza nada)
- Visual: Card com fundo `bg-status-pink-muted`, borda `border-status-pink/30`, icone de bolo animado (confetti), avatares dos aniversariantes, e mensagem "Feliz aniversario!"
- Usa componentes canonicos: `Card`, `Avatar`, `UserLink`, `Badge`
- Layout responsivo: avatares em linha com nome e cargo

Design visual:

```text
+----------------------------------------------------------+
|  [Cake icon]  Hoje e dia de festa!                       |
|                                                          |
|  [Avatar] Guilherme Souza - Diretor de Produto    [link] |
|  [Avatar] Maria Silva - Analista de CS            [link] |
|                                                          |
|  Deseje parabens!                                        |
+----------------------------------------------------------+
```

### 4. Integrar no dashboard (`Index.tsx`)

Inserir `<BirthdayTodayBanner />` logo apos o `<DashboardHero />` e antes do `<CultureCard />`, para que seja a primeira coisa visivel quando houver aniversariantes. So renderiza se houver aniversariantes hoje.

### 5. Destaque no card existente `BirthdaysBlock`

No card "Proximos Aniversarios", dar destaque visual extra aos itens com `daysUntil === 0`:
- Fundo `bg-status-pink-muted/50` no item
- Badge "Hoje!" ao lado do nome
- Avatar com borda mais forte `border-status-pink`

---

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useHomeData.ts` | Corrigir bug de timezone em `useBirthdays()` e `useWorkAnniversaries()` |
| `src/components/home/BirthdayTodayBanner.tsx` | **Novo** - Banner de destaque para aniversariantes do dia |
| `src/components/home/BirthdaysBlock.tsx` | Destaque visual para items com `daysUntil === 0` |
| `src/pages/Index.tsx` | Integrar `BirthdayTodayBanner` apos o hero |

## Detalhes tecnicos

- O bug ocorre porque `new Date()` retorna a data com hora atual. Ao comparar com `new Date(year, month, day)` (que e meia-noite), aniversarios de "hoje" sao interpretados como "ja passou" apos meia-noite
- A correcao usa `setHours(0, 0, 0, 0)` que e a forma padrao de normalizar datas para comparacao de dia
- O banner consome o mesmo hook `useBirthdays()` que ja tem cache de 10 min, sem queries adicionais
- Nenhuma alteracao de banco de dados necessaria
