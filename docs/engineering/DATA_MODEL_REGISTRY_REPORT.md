# Data Model Registry — Relatório de Implementação

**Data:** 2026-01-09  
**Versão:** 1.0.0

## Resumo

Implementação completa do Data Model Registry como fonte única de verdade para nomes de tabelas, views, funções e enums do banco de dados.

## Arquivos Criados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `docs/engineering/DATA_MODEL_REGISTRY.md` | MD | Documentação legível para humanos e LLMs |
| `docs/engineering/DATA_MODEL_REGISTRY.json` | JSON | Formato máquina para audits |
| `scripts/generate-data-model-registry.ts` | Script | Gerador automático |

## Atualizações

| Documento | Seção | Mudança |
|-----------|-------|---------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | Header | Adicionado link e regra do registry |
| `DEVELOPMENT_STANDARDS.md` | D.6 | Nova seção com regra inquebrável |

## Conteúdo do Registry

- **97 tabelas** do schema `public`
- **20 views** 
- **40+ enums**
- **24+ funções SQL canônicas**
- **Identity Map** com 24 colunas profile_id e 6 auth_user_id

## Como Usar

### Consulta Manual
```bash
# Ver tabelas
cat docs/engineering/DATA_MODEL_REGISTRY.md | grep "^\| \`"

# Ver enums
cat docs/engineering/DATA_MODEL_REGISTRY.json | jq '.enums'
```

### Regenerar
```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
npx tsx scripts/generate-data-model-registry.ts
```

## Regras de Uso

1. **NUNCA inventar nomes** — Consultar registry antes de escrever SQL
2. **Respeitar identity map** — Saber se coluna é profile_id ou auth_user_id  
3. **Regenerar após migrations** — Manter registry atualizado

## Status

✅ **COMPLETO** — Registry é fonte canônica para schema do Hub.
