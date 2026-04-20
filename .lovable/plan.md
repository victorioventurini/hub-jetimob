

## Plano: Resolver 8 erros de build (dependências ausentes)

### Pré-checklist (executado)
- ✅ TCR / DEVELOPMENT_STANDARDS / DATA_MODEL_REGISTRY consultados — nenhuma regra inquebrável afetada (não toca em RLS, BU scoping, query keys, edge functions ou schema).
- ✅ Padrão `sr-only` já adotado no projeto (`dialog.tsx`, `sheet.tsx`, `sidebar.tsx`, `breadcrumb.tsx`, etc.) — substituição segue convenção existente.
- ✅ `@testing-library/user-event` é dependência sister do `@testing-library/react@16` já presente; usado em 6 arquivos de teste.

### Diagnóstico
8 erros `TS2307` (módulos não encontrados). 2 pacotes referenciados mas ausentes do `package.json`:

| Pacote | Uso | Arquivos |
|---|---|---|
| `@radix-ui/react-visually-hidden` | 1 uso isolado em `CommandDialog` | `src/components/ui/command.tsx` |
| `@testing-library/user-event` | Interações em testes | 6 arquivos `*.test.tsx` |

### Mudanças

**1. `src/components/ui/command.tsx`** — remover dependência externa, usar padrão interno `sr-only`:
```tsx
// Linha 8: remover
- import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Linhas 31-33: simplificar
- <VisuallyHidden>
-   <DialogTitle>Busca</DialogTitle>
- </VisuallyHidden>
+ <DialogTitle className="sr-only">Busca</DialogTitle>
```

**2. `package.json`** — adicionar em `devDependencies`:
```json
"@testing-library/user-event": "^14.5.2"
```
(Compatível com `@testing-library/react@^16.3.1` já instalado.)

### Validação pós-implementação
1. `tsc --noEmit` / build sem erros TS2307.
2. `Cmd+K` (`CommandDialog`) continua funcional e acessível (screen readers leem "Busca" via `sr-only`).
3. Suítes de teste com `userEvent.click/type/setup` voltam a compilar.

### Observações
- Zero impacto em RLS, edge functions, schema, query keys, BU isolation, RBAC.
- 1 arquivo de código alterado + 1 dependência adicionada. Nenhum componente novo.
- Alinhado a `DEVELOPMENT_STANDARDS` (preferir primitivos do design system aos pacotes externos quando equivalentes).

