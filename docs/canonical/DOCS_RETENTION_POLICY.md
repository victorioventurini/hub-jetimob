# 📋 Política de Retenção de Documentação

**Versão:** v1.0.0  
**Última atualização:** 2026-04-22  
**Status:** Normativo

---

## Princípios

1. **Documentos canônicos** (`docs/canonical/`) — vivos, versionados, nunca arquivados.
2. **Auditorias e relatórios** (`docs/audits/`) — só a versão **mais recente de cada categoria** permanece ativa; o restante é movido para `docs/archive/audits-<período>/`.
3. **Guias operacionais** (`docs/guides/`) — vivos enquanto refletirem prática vigente; obsoletos vão para `docs/archive/guides/`.
4. **Memórias persistentes** (`mem://`) — máximo de ~50; consolidar quando ultrapassar.

---

## Janelas de retenção

| Tipo | Local ativo | Janela | Destino após janela |
|------|-------------|--------|---------------------|
| Relatório de health/auditoria | `docs/audits/` | 1 versão por categoria | `docs/archive/audits-<YYYY-Qn>/` |
| Análise sistêmica | `docs/audits/` | última | `docs/archive/audits-<YYYY-Qn>/` |
| Wave/migration report | `docs/archive/waves/` | permanente histórico | — |
| Plano de refatoração executado | `docs/archive/plans/` | permanente histórico | — |
| Documento canônico obsoleto | — | n/a | `docs/archive/canonical-deprecated/` com nota explicativa |

---

## Regras de Atualização

1. **Antes de criar nova auditoria**, mover a versão anterior da mesma categoria para o archive trimestral correspondente.
2. **Antes de criar novo plano**, marcar o anterior com status `EXECUTED` ou `DROPPED` e arquivar.
3. **Versão do TCR** em `supabase/functions/_shared/tcr/index.ts` deve refletir a versão de `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (sincronização obrigatória).
4. **Índice (`docs/DOCUMENTATION_INDEX.md`)** deve ser atualizado a cada mudança em `canonical/`, `audits/` ou `guides/`.

---

## Processo de Arquivamento

```bash
# Exemplo: arquivar auditorias de Q1 2026
mkdir -p docs/archive/audits-2026-q1
git mv docs/audits/HEALTH_REPORT_2026-01-22.md docs/archive/audits-2026-q1/
```

Após arquivar:
- Atualizar `docs/DOCUMENTATION_INDEX.md` removendo referência antiga.
- Atualizar `docs/audits/README.md` com inventário corrente.

---

*Mantido pela equipe de arquitetura.*
