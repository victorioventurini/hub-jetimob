

# Plano: Correção do Trigger de Histórico de KPI

## Resumo Executivo

Corrigir erro "column 'auth_uid' does not exist" que ocorre ao editar KPIs. O problema está no trigger `fn_kpi_target_history_trigger` que referencia uma coluna inexistente na tabela `profiles`.

---

## Diagnóstico

### Causa Raiz

O trigger `fn_kpi_target_history_trigger` (criado na migração v2.86.0) contém um erro na query de resolução do perfil do usuário:

```sql
-- ERRADO (código atual)
SELECT id INTO v_profile_id
FROM public.profiles
WHERE auth_uid = auth.uid()  -- ❌ Coluna não existe!
LIMIT 1;
```

A tabela `profiles` possui a coluna `user_id`, não `auth_uid`.

### Solução Canônica

Conforme IDENTITY_CONVENTION, a função `my_profile_id()` já existe e é a forma correta de obter o profile_id do usuário logado:

```sql
-- Função canônica existente
SELECT id FROM profiles WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1
```

---

## Solução Proposta

Criar uma migration para corrigir a função do trigger, substituindo a query incorreta pelo uso da função canônica `my_profile_id()`.

### Código Corrigido

```sql
CREATE OR REPLACE FUNCTION public.fn_kpi_target_history_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Só registra se target_value ou target_source mudou
  IF (
    OLD.target_value IS DISTINCT FROM NEW.target_value OR
    OLD.target_source IS DISTINCT FROM NEW.target_source
  ) THEN
    -- Obter profile_id usando função canônica
    v_profile_id := my_profile_id();
    
    INSERT INTO public.kpi_target_history (
      kpi_id,
      bu_id,
      old_target_value,
      new_target_value,
      old_target_source,
      new_target_source,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.bu_id,
      OLD.target_value,
      NEW.target_value,
      OLD.target_source,
      NEW.target_source,
      v_profile_id,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

## Resumo de Alterações

| Tipo | Descrição |
|------|-----------|
| Migration SQL | `CREATE OR REPLACE FUNCTION fn_kpi_target_history_trigger()` usando `my_profile_id()` |

---

## Conformidade com Padrões do Hub

| Padrão | Status |
|--------|--------|
| IDENTITY_CONVENTION | ✅ Usa função canônica `my_profile_id()` |
| TCR v3.0.0 | ✅ Função SECURITY DEFINER para bypass RLS no trigger |
| Sem duplicação de lógica | ✅ Reutiliza função existente ao invés de query ad-hoc |

---

## Impacto

### Positivo
- Edição de KPIs volta a funcionar
- Histórico de metas continua sendo registrado automaticamente
- Código alinhado com convenções do Hub

### Risco
- Nenhum — é apenas correção de referência de coluna

---

## Testes

Após aplicar a correção:
1. Editar um KPI existente alterando "Meta ou Benchmark"
2. Verificar que o KPI foi salvo sem erro
3. Verificar que o histórico foi registrado em `kpi_target_history`

