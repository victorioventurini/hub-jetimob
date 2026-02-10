

# Correcao: Remover campo `job_title` deprecated do cadastro de usuarios

## Contexto

Ao cadastrar um novo usuario interno na BU Jetimob, o sistema retorna erro generico. A causa raiz e a linha 338 do `JetimoberDialog.tsx`, que envia `job_title: ""` no payload de INSERT. Essa coluna foi removida do banco na Wave 4A, causando rejeicao pelo PostgREST (erro 400).

## Pre-checklist

- TCR v3.6.0, Identity Convention, RBAC Model e Data Model Registry consultados e confirmados.

## Alteracao

**Arquivo:** `src/components/users/JetimoberDialog.tsx` (linha 338)

Remover a linha `job_title: "",` do payload de INSERT na `createMutation`. Nenhuma outra alteracao necessaria — permissoes, RLS e demais campos estao corretos.

## Auditoria adicional

Varredura no codebase por outras referencias residuais a `job_title` (coluna texto) que possam causar erros similares em outros fluxos.

