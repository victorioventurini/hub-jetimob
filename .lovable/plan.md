
# Plano: Multi-LLM via Lovable AI Gateway (Fase 1)

## Contexto e Pré-Checklist ✅

### Documentação Consultada
| Documento | Versão | Pontos Relevantes |
|-----------|--------|-------------------|
| **TCR** | v3.4.3 | Stack IA usa Lovable AI Gateway, `ai_agents.model_name` é `text` flexível |
| **DEVELOPMENT_STANDARDS** | v1.23.0 | Query keys centralizadas, edge functions com middleware |
| **DATA_MODEL_REGISTRY** | - | Tabela `ai_agents` já suporta `model_name` genérico |

### Situação Atual
| Componente | Estado | Observação |
|------------|--------|------------|
| `hub_integrations_catalog` | `chatgpt` com `supports_agents: true` | Nome legado "ChatGPT / OpenAI" |
| `hub_integrations_global_config` | API Key OpenAI configurada | Funciona com OpenAI direto |
| `ai_agents` | 11 agentes ativos | Todos usam modelos GPT (`gpt-4o-mini`, `gpt-4-turbo`) |
| `llm-client.ts` | Lógica binária OpenAI vs Gateway | Precisa refatorar para multi-provider |
| `AgentFormPage.tsx` | Dropdown hardcoded com modelos GPT | Precisa adicionar modelos Gemini |

### Objetivo
Permitir que cada agente use um modelo LLM diferente (GPT, Gemini, etc.) via Lovable AI Gateway, **sem necessidade de API Key adicional** para modelos do Gateway.

---

## Arquitetura Multi-LLM

```
┌──────────────────────────────────────────────────────────────┐
│                     AgentFormPage.tsx                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Select de Modelo:                                     │    │
│  │  • GPT-4o (openai/gpt-5)                             │    │
│  │  • GPT-4o Mini (openai/gpt-5-mini)                   │    │
│  │  • Gemini 2.5 Flash (google/gemini-2.5-flash) ⭐     │    │
│  │  • Gemini 2.5 Pro (google/gemini-2.5-pro)            │    │
│  │  • Gemini 2.5 Flash Lite (google/gemini-2.5-flash-lite) │ │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     llm-client.ts                             │
│  resolveLLMConfig(preferredModel)                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Roteamento por prefixo:                                │  │
│  │  • google/* → Lovable Gateway (LOVABLE_API_KEY)        │  │
│  │  • openai/* → Lovable Gateway (LOVABLE_API_KEY)        │  │
│  │  • gpt-* (legacy) → OpenAI Direct (se API Key existe)  │  │
│  │                   → Lovable Gateway (fallback)          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Lovable AI Gateway                               │
│     https://ai.gateway.lovable.dev/v1/chat/completions       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Modelos Suportados:                                    │  │
│  │  • google/gemini-2.5-pro                               │  │
│  │  • google/gemini-2.5-flash (default)                   │  │
│  │  • google/gemini-2.5-flash-lite                        │  │
│  │  • google/gemini-3-pro-preview                         │  │
│  │  • google/gemini-3-flash-preview                       │  │
│  │  • openai/gpt-5                                        │  │
│  │  • openai/gpt-5-mini                                   │  │
│  │  • openai/gpt-5-nano                                   │  │
│  │  • openai/gpt-5.2                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Alterações Planejadas

### 1. Refatorar `llm-client.ts` — Roteamento por Prefixo

**Arquivo:** `supabase/functions/_shared/llm-client.ts`

**Lógica Atual (binária):**
```typescript
const useOpenAI = !!openAIApiKey;
return {
  apiUrl: useOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions",
  apiKey: (useOpenAI ? openAIApiKey : lovableApiKey)!,
  model: useOpenAI ? preferredModel : "google/gemini-2.5-flash",
}
```

**Nova Lógica (por prefixo):**
```typescript
export async function resolveLLMConfig(
  serviceClient: any,
  preferredModel: string | null
): Promise<LLMConfig | null> {
  const openAIApiKey = await getIntegrationApiKey(serviceClient, "chatgpt");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  // Determinar provider pelo prefixo do modelo
  const modelPrefix = preferredModel?.split('/')[0];
  const isGatewayModel = modelPrefix === 'google' || modelPrefix === 'openai';
  const isLegacyGptModel = preferredModel?.startsWith('gpt-');
  
  // Gateway models: sempre usar Lovable Gateway
  if (isGatewayModel) {
    if (!lovableApiKey) return null;
    return {
      apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableApiKey,
      model: preferredModel!,
      maxTokens: 800,
      temperature: 0.7,
    };
  }
  
  // Legacy GPT models: tentar OpenAI direto, fallback para Gateway
  if (isLegacyGptModel && openAIApiKey) {
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: openAIApiKey,
      model: preferredModel!,
      maxTokens: 800,
      temperature: 0.7,
    };
  }
  
  // Default: Lovable Gateway com Gemini Flash
  if (lovableApiKey) {
    return {
      apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableApiKey,
      model: "google/gemini-2.5-flash",
      maxTokens: 800,
      temperature: 0.7,
    };
  }
  
  return null;
}
```

### 2. Atualizar Dropdown de Modelos no `AgentFormPage.tsx`

**Arquivo:** `src/modules/integrations/pages/AgentFormPage.tsx`

**Atual (linha ~55-59):**
```typescript
const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Mais capaz e versátil' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Rápido e econômico' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Contexto estendido' },
];
```

**Novo:**
```typescript
// Organizado por provider para clareza
const MODELS = [
  // Google Gemini (via Lovable Gateway)
  { 
    value: 'google/gemini-2.5-flash', 
    label: 'Gemini 2.5 Flash', 
    description: 'Balanceado: boa performance com baixo custo',
    provider: 'google',
    recommended: true,
  },
  { 
    value: 'google/gemini-2.5-pro', 
    label: 'Gemini 2.5 Pro', 
    description: 'Melhor raciocínio e contexto estendido',
    provider: 'google',
  },
  { 
    value: 'google/gemini-2.5-flash-lite', 
    label: 'Gemini 2.5 Flash Lite', 
    description: 'Mais rápido e econômico',
    provider: 'google',
  },
  { 
    value: 'google/gemini-3-flash-preview', 
    label: 'Gemini 3 Flash (Preview)', 
    description: 'Nova geração - velocidade otimizada',
    provider: 'google',
  },
  // OpenAI (via Lovable Gateway)
  { 
    value: 'openai/gpt-5-mini', 
    label: 'GPT-5 Mini', 
    description: 'Excelente custo-benefício',
    provider: 'openai',
  },
  { 
    value: 'openai/gpt-5', 
    label: 'GPT-5', 
    description: 'Mais poderoso, maior custo',
    provider: 'openai',
  },
  // Legacy (para agentes existentes)
  { 
    value: 'gpt-4o-mini', 
    label: 'GPT-4o Mini (Legacy)', 
    description: 'Usa API Key OpenAI configurada',
    provider: 'openai-direct',
    legacy: true,
  },
  { 
    value: 'gpt-4-turbo', 
    label: 'GPT-4 Turbo (Legacy)', 
    description: 'Usa API Key OpenAI configurada',
    provider: 'openai-direct',
    legacy: true,
  },
];
```

### 3. Melhorar UI do Select de Modelo

**Arquivo:** `src/modules/integrations/pages/AgentFormPage.tsx`

Adicionar agrupamento visual por provider:

```tsx
<Select value={modelName} onValueChange={setModelName}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o modelo" />
  </SelectTrigger>
  <SelectContent>
    {/* Google Gemini */}
    <SelectGroup>
      <SelectLabel className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">GOOGLE GEMINI</span>
        <Badge variant="outline" className="text-xs">Recomendado</Badge>
      </SelectLabel>
      {MODELS.filter(m => m.provider === 'google').map((model) => (
        <SelectItem key={model.value} value={model.value}>
          <div className="flex items-center justify-between w-full">
            <span>{model.label}</span>
            {model.recommended && (
              <Badge variant="secondary" className="ml-2 text-xs">⭐</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{model.description}</span>
        </SelectItem>
      ))}
    </SelectGroup>
    
    {/* OpenAI via Gateway */}
    <SelectGroup>
      <SelectLabel className="text-xs font-semibold text-muted-foreground">
        OPENAI (VIA GATEWAY)
      </SelectLabel>
      {MODELS.filter(m => m.provider === 'openai').map((model) => (
        <SelectItem key={model.value} value={model.value}>
          {model.label}
          <span className="text-xs text-muted-foreground ml-2">- {model.description}</span>
        </SelectItem>
      ))}
    </SelectGroup>
    
    {/* Legacy */}
    <SelectGroup>
      <SelectLabel className="text-xs font-semibold text-muted-foreground">
        LEGACY (API KEY PRÓPRIA)
      </SelectLabel>
      {MODELS.filter(m => m.legacy).map((model) => (
        <SelectItem key={model.value} value={model.value}>
          {model.label}
          <span className="text-xs text-muted-foreground ml-2">- {model.description}</span>
        </SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

### 4. Adicionar InfoNotice Explicativo

**Arquivo:** `src/modules/integrations/pages/AgentFormPage.tsx`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Configurações do Modelo</CardTitle>
    <CardDescription>
      Selecione o modelo de IA que este agente utilizará
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <InfoNotice variant="info">
      Modelos <strong>Google Gemini</strong> e <strong>OpenAI via Gateway</strong> 
      são provisionados automaticamente via Lovable AI — sem necessidade de API Key adicional.
      Modelos <strong>Legacy</strong> requerem a API Key OpenAI configurada na integração ChatGPT.
    </InfoNotice>
    
    {/* Select de modelo aqui */}
  </CardContent>
</Card>
```

### 5. Atualizar Default para Novos Agentes

**Arquivo:** `src/modules/integrations/pages/AgentFormPage.tsx`

**Atual (linha ~94):**
```typescript
const [modelName, setModelName] = useState('gpt-4o-mini');
```

**Novo:**
```typescript
const [modelName, setModelName] = useState('google/gemini-2.5-flash');
```

### 6. (Opcional) Renomear Integração no Catálogo

**SQL Migration (baixa prioridade):**
```sql
UPDATE hub_integrations_catalog
SET 
  name = 'LLMs / Agentes de IA',
  description = 'Integração com modelos de IA (Gemini, GPT) para chat, automações e agentes inteligentes'
WHERE integration_key = 'chatgpt';
```

---

## Arquivos a Modificar

| Arquivo | Alterações | Prioridade |
|---------|------------|------------|
| `supabase/functions/_shared/llm-client.ts` | Roteamento por prefixo, suporte a modelos Gateway | Alta |
| `src/modules/integrations/pages/AgentFormPage.tsx` | Dropdown de modelos, InfoNotice, default | Alta |
| `hub_integrations_catalog` (SQL) | Renomear "ChatGPT" → "LLMs" (opcional) | Baixa |

---

## Compatibilidade com Agentes Existentes

| Agente Existente | `model_name` Atual | Comportamento |
|------------------|-------------------|---------------|
| Coach de OKRs | `gpt-4o-mini` | Continua funcionando via OpenAI direto (API Key existe) |
| Persona do Vic | `gpt-4-turbo` | Continua funcionando via OpenAI direto |
| Novos Agentes | `google/gemini-2.5-flash` | Usam Lovable Gateway (LOVABLE_API_KEY) |

**Migração gradual:** Agentes existentes continuam funcionando. Ao editar, o admin pode optar por migrar para modelos Gateway.

---

## Testes Necessários

1. **Criar novo agente** com modelo Gemini → Deve funcionar sem API Key OpenAI
2. **Editar agente existente** (GPT legacy) → Deve manter funcionamento
3. **Invocar agente Gemini** via `/invoke-vic` → Resposta correta via Gateway
4. **Fallback** → Se LOVABLE_API_KEY não existe, retorna erro apropriado

---

## Critérios de Sucesso

- [ ] Dropdown de modelos mostra opções Gemini e GPT organizadas
- [ ] Novos agentes usam `google/gemini-2.5-flash` por padrão
- [ ] Modelos com prefixo `google/` ou `openai/` usam Lovable Gateway
- [ ] Modelos legacy (`gpt-*`) usam OpenAI direto se API Key existe
- [ ] InfoNotice explica a diferença entre Gateway e Legacy
- [ ] Agentes existentes continuam funcionando (backward compatibility)
