# URL State Migration Report

## Status: Em Progresso

Data de início: 2024-01-07

## Infraestrutura Criada

### Hooks e Utilitários

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `src/shared/url/types.ts` | ✅ | Tipos base |
| `src/shared/url/parsers.ts` | ✅ | Parsers e serializers |
| `src/shared/url/schemas.ts` | ✅ | Schemas reutilizáveis |
| `src/shared/url/constants.ts` | ✅ | Constantes globais |
| `src/shared/url/useUrlState.ts` | ✅ | Hooks principais |
| `src/shared/url/index.ts` | ✅ | Exports centralizados |
| `src/shared/query/buildQueryKey.ts` | ✅ | Helper para queryKeys |

### Componentes UI

| Componente | Status | Descrição |
|------------|--------|-----------|
| `UrlSearchInput` | ✅ | Input de busca com debounce |
| `UrlSelect` | ✅ | Select simples |
| `UrlMultiSelect` | ✅ | Multi-select com checkboxes |
| `UrlDateRangePicker` | ✅ | Seletor de período |
| `UrlPagination` | ✅ | Paginação completa |
| `UrlSortControl` | ✅ | Controle de ordenação |
| `UrlFilterBar` | ✅ | Barra de filtros ativos |

### Documentação

| Documento | Status |
|-----------|--------|
| `docs/URL_STATE_STANDARD.md` | ✅ |
| `docs/qa/QA_URL_STATE.md` | ✅ |
| `docs/URL_STATE_MIGRATION_REPORT.md` | ✅ |

## Módulos Migrados

| Módulo | Página | Status | Parâmetros |
|--------|--------|--------|------------|
| Permissions | BuPermissionsPage | ✅ | `tab`, `q` |

## Parâmetros Padronizados

| Parâmetro | Tipo | Default | Uso |
|-----------|------|---------|-----|
| `q` | string | `""` | Busca textual |
| `tab` | string | varia | Aba ativa |
| `page` | number | `1` | Página atual |
| `pageSize` | number | `25` | Itens por página |
| `sort` | string | `""` | Campo de ordenação |
| `dir` | `asc\|desc` | `desc` | Direção |
| `status` | string[] | `[]` | Filtro de status |
| `teamId` | string | `""` | ID do time |
| `squadId` | string | `""` | ID do squad |
| `start` | string | `""` | Data início (YYYY-MM-DD) |
| `end` | string | `""` | Data fim (YYYY-MM-DD) |
| `year` | number | ano atual | Ano selecionado |

## Convenção de Arrays

**Padrão adotado**: Repeated params

```
?status=open&status=paused
```

Compatível nativamente com `URLSearchParams`.

## Resultado do Script de Auditoria

> Execute `npm run audit:urlstate` para atualizar

```
Última execução: Pendente
Páginas com possíveis problemas: Pendente
```

## Próximos Passos

1. [ ] Migrar módulo Tickets
2. [ ] Migrar módulo OKRs
3. [ ] Migrar módulo Assets
4. [ ] Migrar módulo KPIs
5. [ ] Migrar módulo Teams
6. [ ] Executar script de auditoria
7. [ ] Atualizar este relatório

## Exceções

Nenhuma exceção documentada até o momento.

---

*Última atualização: 2024-01-07*
