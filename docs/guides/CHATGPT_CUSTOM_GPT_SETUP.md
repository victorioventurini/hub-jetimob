# Configuração do Custom GPT — Hub da Jet Dev Assistant

Este documento descreve como configurar um Custom GPT no ChatGPT para desenvolvimento no Hub da Jet, com acesso automatizado ao Technical Context Registry (TCR).

---

## 1. Informações do GPT

| Campo | Valor |
|-------|-------|
| **Nome** | Hub da Jet - Dev Assistant |
| **Descrição** | Assistente especializado em desenvolvimento para o Hub da Jet. Consulta automaticamente o TCR (Technical Context Registry) para garantir consistência arquitetural. |

---

## 2. Instruções do Sistema

Cole o seguinte texto no campo "Instructions" do Custom GPT:

```
Você é um desenvolvedor sênior especializado no Hub da Jet, uma plataforma de gestão empresarial multi-tenant.

## REGRA FUNDAMENTAL
Antes de gerar QUALQUER código, você DEVE:
1. Consultar o TCR usando a action "getTcr"
2. Respeitar integralmente as definições do TCR
3. Se houver conflito ou ambiguidade, PERGUNTE antes de prosseguir

## Stack Tecnológica
- Frontend: React 18 + TypeScript + Vite
- Estilização: Tailwind CSS + shadcn/ui
- Estado: TanStack Query (React Query)
- Backend: Supabase (Lovable Cloud)
- Banco: PostgreSQL com RLS

## Princípios de Desenvolvimento
1. **Segurança primeiro**: Sempre considerar RLS e escopos por BU
2. **Consistência**: Seguir padrões existentes no projeto
3. **Simplicidade**: Código limpo e manutenível
4. **Multi-BU**: Todo dado operacional é escopado por Business Unit

## Ao Gerar Código
- Use tokens semânticos do Tailwind (bg-primary, não bg-blue-500)
- Componentes em PascalCase, hooks com prefixo "use"
- Sempre tipar com TypeScript
- Usar os tipos de src/integrations/supabase/types.ts
- Considerar RLS policies em todas as queries

## Estrutura de Módulos
src/modules/[module]/
├── components/  # Componentes do módulo
├── hooks/       # Hooks do módulo
├── pages/       # Páginas do módulo
├── types.ts     # Tipos do módulo
└── index.ts     # Exports públicos

## Quando Consultar o TCR
- Início de qualquer tarefa de código
- Dúvidas sobre entidades/tabelas
- Regras de negócio
- Padrões de nomenclatura
- Estrutura de permissões

Use a action getTcr para obter o contexto completo ou seções específicas.
```

---

## 3. Configuração da Action (API)

### 3.1 OpenAPI Schema

Cole o seguinte schema YAML na seção "Actions" do Custom GPT:

```yaml
openapi: 3.0.0
info:
  title: Hub TCR API
  description: API para acessar o Technical Context Registry do Hub da Jet
  version: 1.0.0
servers:
  - url: https://oiwnghihyqdsinouwmga.supabase.co/functions/v1
    description: Production
paths:
  /get-tcr:
    get:
      operationId: getTcr
      summary: Retorna o Technical Context Registry do Hub
      description: |
        Retorna o TCR completo ou uma seção específica.
        
        Seções disponíveis:
        - architecture: Visão geral da arquitetura
        - entities: Domínio de dados
        - modules: Módulos do sistema
        - business-rules: Regras de negócio
        - integrations: Eventos e integrações
        - technical-debt: Débito técnico
        - conventions: Convenções de código
      security:
        - apiKey: []
      parameters:
        - name: section
          in: query
          required: false
          schema:
            type: string
            enum:
              - architecture
              - entities
              - modules
              - business-rules
              - integrations
              - technical-debt
              - conventions
          description: |
            Seção específica do TCR.
            Omita para retornar o TCR completo.
      responses:
        '200':
          description: TCR em formato Markdown
          content:
            text/markdown:
              schema:
                type: string
        '400':
          description: Seção inválida
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                  available_sections:
                    type: array
                    items:
                      type: string
        '401':
          description: API Key inválida ou ausente
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: x-api-key
      description: API Key para autenticação
```

### 3.2 Configuração da API Key

1. No Custom GPT, vá em "Actions" → "Authentication"
2. Selecione "API Key"
3. Em "Auth Type", selecione "Custom"
4. Em "Custom Header Name", digite: `x-api-key`
5. Cole a API Key que você configurou no Supabase Secrets

---

## 4. Conversation Starters Sugeridos

Adicione estes exemplos de início de conversa:

1. "Preciso criar um novo componente para listar OKRs do time"
2. "Como funciona a estrutura de permissões do Hub?"
3. "Quais são as regras de negócio para check-ins de KR?"
4. "Preciso adicionar uma nova tabela para feedbacks"
5. "Qual a estrutura correta para criar um novo módulo?"

---

## 5. Testando o GPT

Após configurar, teste com as seguintes perguntas:

### Teste 1: Consulta ao TCR
```
Me mostre a estrutura de entidades do Hub
```
**Esperado**: GPT deve chamar `getTcr` com `section=entities`

### Teste 2: Geração de código
```
Crie um hook para buscar os KPIs de um time
```
**Esperado**: GPT deve:
1. Consultar o TCR (seção entities ou business-rules)
2. Gerar código TypeScript seguindo os padrões
3. Usar types de supabase

### Teste 3: Regras de negócio
```
Quantos objetivos um time pode ter?
```
**Esperado**: GPT deve responder "Máximo 3" (consultando TCR se necessário)

---

## 6. Manutenção

### Atualizando o TCR

O TCR está embarcado na Edge Function `get-tcr`. Para atualizar:

1. Edite `supabase/functions/get-tcr/index.ts`
2. Atualize as seções em `TCR_SECTIONS`
3. Incremente `TCR_VERSION`
4. Atualize `TCR_UPDATED_AT`
5. Deploy acontece automaticamente

### Verificando a API Key

Se a action parar de funcionar:

1. Verifique se a secret `TCR_API_KEY` existe no Supabase
2. Confirme que a API Key no Custom GPT está correta
3. Teste manualmente: 
   ```bash
   curl -H "x-api-key: SUA_KEY" https://oiwnghihyqdsinouwmga.supabase.co/functions/v1/get-tcr
   ```

---

## 7. Segurança

- ⚠️ **Nunca compartilhe a API Key publicamente**
- A API Key está armazenada nos Supabase Secrets
- O endpoint não requer JWT, mas exige a API Key customizada
- Logs de acesso são registrados para auditoria

---

## 8. Troubleshooting

| Problema | Solução |
|----------|---------|
| "Unauthorized" na action | Verifique se a API Key está correta no GPT |
| "Server configuration error" | TCR_API_KEY não está configurada no Supabase |
| GPT não consulta TCR | Reforce nas instruções que DEVE consultar antes de gerar código |
| Seção não encontrada | Use um dos valores válidos: architecture, entities, modules, business-rules, integrations, technical-debt, conventions |

---

## 9. Links Úteis

- **Endpoint do TCR**: `https://oiwnghihyqdsinouwmga.supabase.co/functions/v1/get-tcr`
- **Documento TCR completo**: `docs/TECHNICAL_CONTEXT_REGISTRY.md`
- **Custom GPTs**: https://chat.openai.com/gpts/editor

---

*Última atualização: 2026-01-05*
