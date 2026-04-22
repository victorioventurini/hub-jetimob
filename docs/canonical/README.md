# 📐 Documentos Canônicos — Hub da Jet

**Última atualização:** 2026-04-22  
**Categoria:** NORMATIVO

---

## Sobre Esta Pasta

Esta pasta contém os **documentos normativos** do projeto — as fontes únicas de verdade que definem padrões, arquiteturas e convenções obrigatórias.

## Documentos Neste Diretório

| Documento | Descrição | Versão |
|-----------|-----------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | **Fonte única de verdade** — arquitetura, entidades, regras de negócio | v3.28.0 |
| `AI_AGENTS_PHILOSOPHY.md` | Governança de criação/reutilização de agentes IA | v1.0.0 |
| `DEVELOPMENT_STANDARDS.md` | Padrões obrigatórios de desenvolvimento | v1.28.0 |
| `DATA_MODEL_REGISTRY.md` | Schema canônico (tabelas, views, funções) | v1.3.0 |
| `IDENTITY_CONVENTION.md` | Convenção user_id vs profile_id | v2.2.0 |
| `PERMISSIONS_AND_RBAC_MODEL.md` | Modelo completo de permissões V2 | v1.5.0 |
| `RBAC_TEMPLATES_V3.md` | Sistema de templates de permissão | v3.0 |
| `QUERY_KEYS_STANDARD.md` | Padrão de query keys centralizadas | Normativo |
| `BU_SCOPED_SUPABASE_RULES.md` | Regras PRE-BU/POST-BU + Filtragem Frontend Obrigatória | v4.1.0 |
| `SCHEMA_QUICK_REFERENCE.md` | Referência rápida para validação de schema | v1.0.0 |
| `UI_COMPONENTS_REGISTRY.md` | Registro de componentes UI canônicos | v1.7.0 |
| `RESPONSIBILITY_MIGRATION_POLICY.md` | Política de migração de responsabilidades | v1.0.0 |
| `HOOKS_BARREL_STANDARD.md` | Regras de barrels para `hooks/` e sub-barrels | v1.0.0 |
| `EDGE_PERFORMANCE_STANDARD.md` | Padrões de performance em Edge Functions | v1.0.0 |
| `EDGE_ERROR_RESPONSE_STANDARD.md` | Contrato de erro em Edge Functions | Normativo |
| `DOCS_RETENTION_POLICY.md` | Política de retenção de documentação | v1.0.0 |
| `ANALYSIS_MODULE.md` | Módulo Análise Estratégica | v1.0.0 |

## Regras de Manutenção

1. **Alterações** requerem incremento de versão
2. **Novos padrões** devem ser referenciados no TCR
3. **Conflitos** são resolvidos pelo TCR (fonte máxima)
4. **Versão do TCR** em `supabase/functions/_shared/tcr/index.ts` deve ser sincronizada a cada release

---

*Mantido pela equipe de arquitetura.*
