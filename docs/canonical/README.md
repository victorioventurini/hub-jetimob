# 📐 Documentos Canônicos — Hub da Jet

**Última atualização:** 2026-04-21  
**Categoria:** NORMATIVO

---

## Sobre Esta Pasta

Esta pasta contém os **documentos normativos** do projeto — as fontes únicas de verdade que definem padrões, arquiteturas e convenções obrigatórias.

## Documentos Neste Diretório

| Documento | Descrição | Versão |
|-----------|-----------|--------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | **Fonte única de verdade** — arquitetura, entidades, regras de negócio (inclui §4.8.1 Framework Unificado de Wizards e §4.12 Governança de Agentes de IA) | v3.27.0 |
| `AI_AGENTS_PHILOSOPHY.md` | Governança de criação/reutilização de agentes IA (matriz de decisão + antipadrões) | v1.0.0 |
| `DEVELOPMENT_STANDARDS.md` | Padrões obrigatórios de desenvolvimento | v1.28.0 |
| `DATA_MODEL_REGISTRY.md` | Schema canônico (tabelas, views, funções) | v1.2.2 |
| `IDENTITY_CONVENTION.md` | Convenção user_id vs profile_id | v2.2.0 |
| `PERMISSIONS_AND_RBAC_MODEL.md` | Modelo completo de permissões V2 | v1.5.0 |
| `RBAC_TEMPLATES_V3.md` | Sistema de templates de permissão | v3.0 |
| `QUERY_KEYS_STANDARD.md` | Padrão de query keys centralizadas | Normativo |
| `BU_SCOPED_SUPABASE_RULES.md` | Regras PRE-BU/POST-BU + **Filtragem Frontend Obrigatória** | v4.1.0 |
| `SCHEMA_QUICK_REFERENCE.md` | Referência rápida para validação de schema | v1.0.0 |
| `UI_COMPONENTS_REGISTRY.md` | Registro de componentes UI canônicos | v1.7.0 |
| `RESPONSIBILITY_MIGRATION_POLICY.md` | Política de migração de responsabilidades | v1.0.0 |
| `HOOKS_BARREL_STANDARD.md` | Regras de barrels para `hooks/` e sub-barrels (`queries/`) | v1.0.0 |

## Regras de Manutenção

1. **Alterações** requerem incremento de versão
2. **Novos padrões** devem ser referenciados no TCR
3. **Conflitos** são resolvidos pelo TCR (fonte máxima)

---

*Mantido pela equipe de arquitetura.*
