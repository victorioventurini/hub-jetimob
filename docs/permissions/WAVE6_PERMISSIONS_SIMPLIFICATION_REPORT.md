# Wave 6 — Permissions Simplification Report

**Data:** 2026-01-08  
**Status:** ✅ DOCUMENTAÇÃO CONCLUÍDA | ⏳ IMPLEMENTAÇÃO PENDENTE

---

## 1. Resumo Executivo

Wave 6 define o plano completo para simplificação do sistema de permissões:

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Permission Keys | 143 (naming inconsistente) | 143 (normalizadas com aliases) |
| Templates | 17 (overlap alto) | 27 v2 (modulares, sem overlap) |
| Surfaces | N/A | 3 (VIEW/OPERATE/ADMINISTER) |
| UI Complexidade | Lista de 143 keys | Surfaces + preview |

---

## 2. Documentos Gerados

| Documento | Propósito |
|-----------|-----------|
| `WAVE6_KEYS_BASELINE.md` | Inventário completo de permission keys |
| `WAVE6_TEMPLATES_BASELINE.md` | Análise de templates e sobreposição |
| `WAVE6_KEY_NORMALIZATION_PLAN.md` | Padrão de naming + aliases |
| `WAVE6_PERMISSION_SURFACES.md` | Mapeamento VIEW/OPERATE/ADMINISTER |
| `WAVE6_TEMPLATE_DIFF.md` | Templates v1 → v2 |
| `QA_WAVE6_PERMISSIONS.md` | Checklist de QA |

---

## 3. Próximos Passos (Implementação)

### 3.1 Database
- [ ] Criar tabela `permission_key_aliases`
- [ ] Atualizar função `has_permission()` para resolver aliases
- [ ] Inserir templates v2 em `permission_groups`
- [ ] Inserir keys normalizadas + aliases

### 3.2 Frontend
- [ ] Atualizar `usePermissions` para suportar aliases
- [ ] Criar componente `PermissionSurfaceSelector`
- [ ] Atualizar UI de `/hub/permissions` com surfaces
- [ ] Criar ferramenta de migração v1 → v2

### 3.3 Validação
- [ ] Executar QA_WAVE6_PERMISSIONS.md
- [ ] Rodar audit-permission-keys
- [ ] Rodar audit-rbac

---

## 4. Compatibilidade

- **Sem breaking changes**: aliases garantem retrocompatibilidade
- **Migração gradual**: usuários continuam com v1 até migração explícita
- **RLS inalterado**: has_permission() resolve aliases transparentemente

---

## 5. Conclusão

Wave 6 está **documentada e pronta para implementação**. A fase de documentação estabeleceu:

1. ✅ Baseline completo (keys + templates)
2. ✅ Plano de normalização com aliases
3. ✅ Surfaces definidas por módulo
4. ✅ Templates v2 especificados
5. ✅ QA preparado

Implementação de banco e código segue na próxima iteração.

---

*Relatório final Wave 6 - Fase de Documentação*
