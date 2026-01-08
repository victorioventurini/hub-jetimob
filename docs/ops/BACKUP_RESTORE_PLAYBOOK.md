# Playbook Oficial de Backup & Restore — Hub Jetimob

> **Versão:** 1.0.0  
> **Data:** 2026-01-08  
> **Classificação:** Interno / Operações  
> **Stack:** Supabase Pro + Postgres 15 + RLS  
> **Referência:** TCR v2.11.1+

---

## 1. Objetivo

Este playbook define procedimentos oficiais para backup e restore do Hub Jetimob, garantindo recuperação de dados em cenários de:

| Cenário | Descrição | Urgência |
|---------|-----------|----------|
| Erro humano | DELETE/UPDATE acidental em produção | Alta |
| Migration errada | SQL com efeito colateral não previsto | Alta |
| Bug em produção | Lógica corrompendo dados progressivamente | Média-Alta |
| Corrupção de dados | Inconsistência detectada em auditoria | Alta |
| Incidente de segurança | Acesso não autorizado com alteração de dados | Crítica |

**Princípio fundamental:** Nunca executar restore sem alinhamento com stakeholders e validação em ambiente controlado.

---

## 2. Estratégia de Backup

### 2.1 Backups Automáticos (Supabase Pro)

| Atributo | Valor |
|----------|-------|
| Frequência | Diário (automático) |
| Retenção | 7 dias |
| Cobertura | Banco completo (todas as schemas) |
| Inclui | Dados, estrutura, RLS policies, triggers, functions |
| Não inclui | Secrets do Vault, Storage objects (backup separado) |

**Quando usar:**
- Restore de estado completo até 7 dias atrás
- Desastre total

**Riscos:**
- Granularidade de 24h (pode perder dados do dia)
- Restore substitui banco inteiro

**Responsabilidade:** Supabase (infraestrutura) + Equipe Hub (monitoramento)

---

### 2.2 Point-in-Time Recovery (PITR)

| Atributo | Valor |
|----------|-------|
| Disponibilidade | Supabase Pro |
| Granularidade | Segundos |
| Retenção | 7 dias |
| Cobertura | WAL logs completos |

**Quando usar:**
- Restore para momento específico (ex: 5 minutos antes do DELETE)
- Incidentes com timestamp conhecido

**Riscos:**
- Requer downtime durante restore
- Dados após o ponto escolhido são perdidos
- Não é seletivo (restaura tudo)

**Responsabilidade:** Equipe Hub (decisão) + Supabase Dashboard (execução)

---

### 2.3 Backup Lógico (pg_dump)

| Atributo | Valor |
|----------|-------|
| Tipo | Manual / Agendado |
| Formato | Custom (-Fc) |
| Cobertura | Schema public + extensões |
| Portabilidade | Alta (restore em qualquer Postgres) |

**Quando usar:**
- Migração entre ambientes
- Backup pré-wave (obrigatório)
- Auditoria offline
- Restore seletivo de tabelas

**Riscos:**
- Snapshot estático (não captura mudanças durante dump)
- Requer acesso direto ao banco
- Arquivo pode ser grande

**Responsabilidade:** Equipe Hub (execução e armazenamento)

---

## 3. Backup Lógico — Procedimento Detalhado

### 3.1 Pré-requisitos

```bash
# Instalar pg_dump compatível com versão do Supabase (Postgres 15)
# macOS
brew install postgresql@15

# Ubuntu
sudo apt install postgresql-client-15
```

### 3.2 Obter Connection String

1. Acessar Supabase Dashboard → Settings → Database
2. Copiar **Connection string (URI)** com modo `transaction`
3. Substituir `[YOUR-PASSWORD]` pela senha do banco

### 3.3 Comando Padrão

```bash
# Variáveis
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hub_jetimob_${BACKUP_DATE}.dump"

# Backup completo (formato custom)
pg_dump \
  --format=custom \
  --verbose \
  --no-owner \
  --no-acl \
  --schema=public \
  --file="${BACKUP_FILE}" \
  "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Verificar integridade
pg_restore --list "${BACKUP_FILE}" | head -20
```

### 3.4 Backup Pré-Wave (Obrigatório)

```bash
# Antes de qualquer wave de migrations
WAVE_NAME="wave7"
BACKUP_FILE="hub_jetimob_pre_${WAVE_NAME}_$(date +%Y%m%d_%H%M%S).dump"

pg_dump \
  --format=custom \
  --verbose \
  --no-owner \
  --schema=public \
  --file="${BACKUP_FILE}" \
  "${DATABASE_URL}"

# Registrar no log
echo "Backup pré-${WAVE_NAME}: ${BACKUP_FILE}" >> backups/backup_log.txt
```

### 3.5 Frequência Sugerida

| Momento | Frequência | Obrigatório |
|---------|------------|-------------|
| Pré-wave | Antes de cada wave | ✅ Sim |
| Semanal | Domingo 03:00 UTC | ✅ Sim |
| Pré-release | Antes de deploy major | ✅ Sim |
| Ad-hoc | Conforme necessidade | Não |

### 3.6 Política de Armazenamento

| Local | Retenção | Criptografia |
|-------|----------|--------------|
| Storage seguro (S3/GCS) | 90 dias | AES-256 |
| Local dev | 7 dias | N/A |
| Git | ❌ PROIBIDO | N/A |

**⚠️ ALERTAS CRÍTICOS:**
- NUNCA commitar backups no Git
- NUNCA armazenar em local público
- SEMPRE criptografar em repouso
- SEMPRE versionar nome do arquivo com timestamp

---

## 4. Estratégias de Restore

### 4.1 Restore via Supabase Dashboard (PITR)

**Quando usar:**
- Incidente com timestamp conhecido
- Restore completo necessário
- Dados após o ponto podem ser perdidos

**Passo a passo:**

1. **Comunicar stakeholders**
   - Notificar equipe sobre downtime iminente
   - Obter aprovação para perda de dados pós-timestamp

2. **Acessar Dashboard**
   - Supabase Dashboard → Database → Backups

3. **Selecionar ponto de restore**
   - Escolher data/hora exata (UTC)
   - Confirmar que é ANTES do incidente

4. **Iniciar restore**
   - Clicar "Restore to this point"
   - Aguardar conclusão (pode levar minutos a horas)

5. **Validar**
   - Executar checklist pós-restore (seção 7)

**Riscos:**
- Downtime durante restore
- Perda de dados pós-timestamp
- Não é possível cancelar após início

**Observações:**
- Restore cria novo banco e migra conexões
- Edge Functions podem precisar redeploy
- Cache de aplicação deve ser invalidado

---

### 4.2 Restore via pg_restore (Ambiente Controlado)

**Quando usar:**
- Restore seletivo de tabelas
- Teste em staging antes de produção
- Migração entre ambientes

**Passo a passo:**

1. **Preparar ambiente de teste**
   ```bash
   # Criar banco temporário ou usar staging
   createdb hub_jetimob_restore_test
   ```

2. **Restore completo (staging)**
   ```bash
   pg_restore \
     --verbose \
     --no-owner \
     --no-acl \
     --dbname="postgresql://..." \
     hub_jetimob_backup.dump
   ```

3. **Restore seletivo (tabela específica)**
   ```bash
   # Listar conteúdo do backup
   pg_restore --list hub_jetimob_backup.dump > toc.txt

   # Editar toc.txt para manter apenas tabelas desejadas
   # Restore seletivo
   pg_restore \
     --verbose \
     --no-owner \
     --use-list=toc.txt \
     --dbname="postgresql://..." \
     hub_jetimob_backup.dump
   ```

4. **Validar em staging**
   - Rodar auditorias
   - Testar funcionalidades críticas
   - Comparar contagem de registros

5. **Aplicar em produção (se aprovado)**
   - Repetir processo em produção com supervisão

**Riscos:**
- Conflitos de FK se restore parcial
- Triggers podem executar durante restore
- Sequences podem ficar desalinhadas

**Observações:**
- SEMPRE testar em staging primeiro
- Desabilitar triggers se necessário: `--disable-triggers`
- Verificar sequences após restore

---

## 5. Procedimentos por Tipo de Incidente

### 5.1 Migration Errada

**Cenário:** SQL de migration causou efeito colateral não previsto.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PARAR: Não executar mais migrations                      │
│ 2. AVALIAR: Qual o impacto? Dados perdidos? Corrompidos?    │
│ 3. DECIDIR: Rollback via PITR ou fix-forward?               │
│ 4. EXECUTAR: Conforme decisão                               │
│ 5. VALIDAR: Checklist pós-restore                           │
│ 6. DOCUMENTAR: Incident report                              │
└─────────────────────────────────────────────────────────────┘
```

**Comandos úteis:**
```sql
-- Ver migrations aplicadas
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

-- Ver último DDL
SELECT * FROM pg_stat_activity WHERE query LIKE 'ALTER%' OR query LIKE 'DROP%';
```

---

### 5.2 DELETE/UPDATE Acidental

**Cenário:** Dados críticos deletados ou sobrescritos por engano.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IDENTIFICAR: Qual tabela? Quantos registros? Quando?     │
│ 2. VERIFICAR: Existe soft delete (deleted_at)?              │
│    - Se sim: UPDATE ... SET deleted_at = NULL               │
│    - Se não: PITR necessário                                │
│ 3. PITR: Restore para timestamp antes do DELETE             │
│ 4. VALIDAR: Dados recuperados corretamente                  │
│ 5. DOCUMENTAR: Incident report                              │
└─────────────────────────────────────────────────────────────┘
```

**Se soft delete existir:**
```sql
-- Recuperar registros soft-deleted
UPDATE public.asset_inventory
SET deleted_at = NULL, updated_at = now()
WHERE deleted_at > '2026-01-08 10:00:00';
```

---

### 5.3 Erro Lógico em Produção

**Cenário:** Bug corrompendo dados progressivamente.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HOTFIX: Deploy correção do bug PRIMEIRO                  │
│ 2. AVALIAR: Extensão da corrupção                           │
│ 3. OPÇÕES:                                                  │
│    a) Script de correção (se dados identificáveis)          │
│    b) PITR (se corrupção extensa)                           │
│ 4. EXECUTAR: Em staging primeiro                            │
│ 5. VALIDAR: Checklist pós-restore                           │
│ 6. DOCUMENTAR: Incident report + RCA                        │
└─────────────────────────────────────────────────────────────┘
```

**Script de correção exemplo:**
```sql
-- Identificar registros afetados
SELECT id, bu_id, status, updated_at
FROM public.okr_objectives
WHERE status = 'corrupted_value'
  AND updated_at > '2026-01-07 00:00:00';

-- Corrigir com auditoria
UPDATE public.okr_objectives
SET 
  status = 'active',
  updated_at = now()
WHERE status = 'corrupted_value'
RETURNING id, bu_id;
```

---

## 6. Responsabilidades

| Ação | Decide | Executa | Valida |
|------|--------|---------|--------|
| Backup pré-wave | Tech Lead | DevOps / Dev | QA |
| Backup semanal | Automação | Sistema | DevOps |
| PITR (produção) | CTO / Tech Lead | DevOps | Equipe completa |
| Restore staging | Dev | Dev | Dev |
| Restore seletivo | Tech Lead | DevOps | QA + Dev |
| Incident report | Tech Lead | Quem executou | CTO |

---

## 7. Checklist Pós-Restore

### 7.1 Validação Imediata (< 5 min)

- [ ] Aplicação carrega sem erros
- [ ] Login funciona
- [ ] Dashboard principal renderiza

### 7.2 Validação Funcional (< 30 min)

- [ ] CRUD em módulo OKRs funciona
- [ ] CRUD em módulo Assets funciona
- [ ] CRUD em módulo Permissions funciona
- [ ] Navegação entre BUs funciona

### 7.3 Validação de BU Scope

```bash
# Rodar auditoria de BU scope
npx ts-node scripts/audit-bu-scope.ts
```

- [ ] Todas as queries respeitam bu_id do header
- [ ] Nenhum vazamento cross-BU detectado

### 7.4 Validação de Permissões

```bash
# Rodar auditoria RBAC
npx ts-node scripts/audit-rbac.ts
```

- [ ] RLS policies ativas em todas as tabelas operacionais
- [ ] has_permission() funcionando corretamente
- [ ] Usuários com permissões corretas

### 7.5 Auditorias Obrigatórias

```bash
# Build completo
npm run build

# Auditorias de compliance
npx ts-node scripts/audit-query-keys.ts
npx ts-node scripts/audit-identity-usage.ts
npx ts-node scripts/audit-select-star.ts
```

- [ ] Build sem erros
- [ ] Todas auditorias PASS

### 7.6 Contagem de Registros

```sql
-- Comparar com backup/estado anterior
SELECT 
  'bu_units' as table_name, COUNT(*) as count FROM public.bu_units
UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'okr_objectives', COUNT(*) FROM public.okr_objectives
UNION ALL SELECT 'asset_inventory', COUNT(*) FROM public.asset_inventory;
```

- [ ] Contagens batem com expectativa

---

## 8. Boas Práticas

### ✅ DOs (Obrigatório)

| Prática | Motivo |
|---------|--------|
| Fazer backup pré-wave | Rollback garantido |
| Testar restore em staging | Evitar surpresas em produção |
| Documentar todo incidente | Aprendizado e compliance |
| Alinhar com stakeholders antes de restore | Evitar perda de dados não comunicada |
| Manter backup_log.txt atualizado | Rastreabilidade |
| Criptografar backups em repouso | Segurança |
| Validar com checklist completo | Garantir integridade |

### ❌ DON'Ts (Proibido)

| Prática | Risco |
|---------|-------|
| Restaurar produção sem testar em staging | Pode piorar situação |
| Commitar backups no Git | Exposição de dados sensíveis |
| Executar PITR sem aprovação | Perda de dados sem consentimento |
| Ignorar checklist pós-restore | Problemas não detectados |
| Armazenar backups não criptografados | Violação de segurança |
| Fazer restore parcial sem desabilitar triggers | Efeitos colaterais |

---

## 9. Roadmap Futuro

### 9.1 Curto Prazo (Q1 2026)

- [ ] Automação de backup semanal via GitHub Actions
- [ ] Alerta Slack quando backup falha
- [ ] Script de validação pós-backup

### 9.2 Médio Prazo (Q2 2026)

- [ ] Restore drill mensal (staging)
- [ ] Snapshots automáticos pré-wave
- [ ] Dashboard de status de backups

### 9.3 Longo Prazo (Q3-Q4 2026)

- [ ] Backup incremental para storage objects
- [ ] Geo-redundância de backups
- [ ] Automação de restore com aprovação via Slack

---

## 10. Conclusão

O Hub Jetimob possui estratégia de backup e restore robusta, alinhada com:

- **Supabase Pro:** Backups automáticos + PITR com granularidade de segundos
- **pg_dump:** Backup lógico para portabilidade e restore seletivo
- **Procedimentos documentados:** Para cada tipo de incidente
- **Responsabilidades claras:** Quem decide, executa e valida
- **Checklist obrigatório:** Garantindo integridade pós-restore

O sistema está **preparado para produção e escala**, com capacidade de recuperação de incidentes em minutos (PITR) ou horas (restore completo), dependendo da gravidade.

---

## Anexos

### A. Template de Incident Report

```markdown
# Incident Report — [DATA]

## Resumo
- **Data/Hora:** YYYY-MM-DD HH:MM UTC
- **Severidade:** Critical / High / Medium
- **Tipo:** Migration / DELETE / Bug / Security

## Impacto
- Tabelas afetadas:
- Registros afetados:
- BUs impactadas:

## Timeline
- HH:MM — Incidente detectado
- HH:MM — Ação tomada
- HH:MM — Restore iniciado
- HH:MM — Validação concluída

## Causa Raiz
[Descrição]

## Ação Corretiva
[O que foi feito]

## Prevenção
[Como evitar no futuro]

## Responsáveis
- Detectou:
- Executou restore:
- Validou:
- Aprovou:
```

### B. Contatos de Emergência

| Papel | Contato | Escalação |
|-------|---------|-----------|
| Tech Lead | [definir] | Primeiro contato |
| DevOps | [definir] | Execução técnica |
| CTO | [definir] | Aprovação final |
| Supabase Support | support@supabase.io | Problemas de infra |

---

**Última revisão:** 2026-01-08  
**Próxima revisão:** 2026-04-08 (trimestral)
