# Luísa não consegue registrar valores de KPI (Logo Churn / Gross MRR Churn)

## Diagnóstico (confirmado no banco)

- Luísa (`luisa.zanini@jetimob.com`) é **responsável (owner)** dos dois KPIs — "Logo Churn" e "Gross MRR Churn" — e também consta como **contribuidora de dados** em "Logo Churn".
- Porém, na BU Jetimob ela só tem o template `collaborator_base_v2` (+ `okrs_operate_v2`), que concede apenas `kpis.view:bu`. Ela **não** tem `kpis.value.create:bu`, `kpis.value.add:bu` nem `kpis.value.update_own:bu`.
- As regras de acesso da tabela de valores de KPI exigem essas permissões e **ignoram completamente** o fato de a pessoa ser responsável pelo KPI ou contribuidora de dados. Daí os dois erros dos prints:
  - novo registro → bloqueio de acesso na gravação ("new row violates row-level security policy");
  - substituição de valor existente → "Você não tem permissão para editar este valor".
- Auditoria na BU Jetimob: apenas **2 pessoas** são responsáveis/contribuidoras de KPI sem permissão de registro — Luísa Zanini e Uriel Canfield. As outras 133 atribuições de template estão corretas.
- O frontend não faz gate próprio: o botão "Registrar" aparece para todos e o erro só surge na gravação.

## Ajuste proposto

### 1. Correção estrutural (regra de acesso)

Passar a permitir a gravação/edição de valores de KPI também para quem é, no próprio KPI:

- **responsável (owner)** do indicador, ou
- **contribuidor de dados ativo** (`kpi_data_contributors` sem exclusão), na BU corrente.

Ou seja, as regras passam a ser: `permissão por template` **OU** `responsável do KPI` **OU** `contribuidor de dados do KPI`. Isso vale para criar valor e para editar/excluir valor que a própria pessoa registrou (a proteção de "só quem registrou ou o responsável/admin edita" continua valendo).

Isso alinha as regras de acesso com a intenção do produto: quem é designado responsável ou contribuidor de um KPI precisa conseguir alimentá-lo, inclusive dentro do Pré-MBR.

### 2. Correção pontual dos dois usuários

Aplicar o template `kpis_operate_v2` na BU Jetimob para Luísa Zanini e Uriel Canfield, para que também tenham a permissão pela via normal (e vejam/editem valores de KPIs onde não são responsáveis).

### 3. Mensagem de erro mais clara

No modal de registro de valor, quando a gravação for negada por acesso, exibir uma mensagem orientativa ("Você não tem permissão para registrar valores deste KPI — fale com o administrador da BU") em vez do texto técnico de política de segurança.

## Detalhes técnicos

- Migração ajustando as políticas `kpi_values_insert_v2`, `kpi_values_update_v3` e `kpi_values_delete_v2`, adicionando uma função `security definer` auxiliar (ex.: `public.can_write_kpi_value(_profile_id uuid, _kpi_id uuid)`) que resolve: permissão por template **OU** `kpi_metrics.owner_user_id = _profile_id` **OU** contribuidor ativo em `kpi_data_contributors` (`deleted_at is null`), sempre com o filtro de BU corrente (`is_current_bu`) preservado.
- `kpi_values_select_v3` fica inalterada (leitura já é liberada por `kpis.view:bu`).
- Inserção de 2 registros em `bu_user_permission_templates_v2` (template `kpis_operate_v2`, BU Jetimob) para os dois perfis.
- Ajuste de tradução de erro no fluxo de registro de valor de KPI (modal usado tanto em `/kpis` quanto no Pré-MBR), mapeando erros de política de acesso (código `42501` / "row-level security") para a mensagem amigável.
