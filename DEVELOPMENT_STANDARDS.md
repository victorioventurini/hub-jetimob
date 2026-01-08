# Development Standards - Hub Jetimob

## Navegação entre Rotas

### Regra Canônica (OBRIGATÓRIA)

❌ **PROIBIDO**: `onClick={() => navigate(...)}` em `<div>`, `<span>`, `<li>`, `<button>` ou similares

✅ **OBRIGATÓRIO**: Usar `<Link>` ou `<NavLink>` do `react-router-dom`

### Por quê?

O padrão `onClick + navigate()` impede:
- Cmd+Click / Ctrl+Click abrir em nova aba
- Clique do meio do mouse
- Context menu "Abrir em nova aba"

### Padrões de Implementação

#### Cards e Containers Clicáveis

```tsx
// ❌ PROIBIDO
<div onClick={() => navigate(`/teams/${id}`)}>
  <TeamCard team={team} />
</div>

// ✅ CORRETO
<Link to={`/teams/${id}`} className="block">
  <TeamCard team={team} />
</Link>
```

#### Botões CTA

```tsx
// ❌ PROIBIDO
<Button onClick={() => navigate('/okrs')}>Ver todos</Button>

// ✅ CORRETO
<Button asChild>
  <Link to="/okrs">Ver todos</Link>
</Button>
```

#### Botões de Voltar

```tsx
// ❌ PROIBIDO (quando a rota pai é conhecida)
<Button onClick={() => navigate('/tickets')}>
  <ArrowLeft /> Voltar
</Button>

// ✅ CORRETO
<Button asChild variant="ghost">
  <Link to="/tickets">
    <ArrowLeft /> Voltar
  </Link>
</Button>
```

### Exceções Permitidas

O uso de `onClick` é permitido APENAS quando:
- Abre modal/dialog
- Expande accordion/collapsible
- Seleciona item (sem navegação)
- Executa ação (delete, edit inline, toggle)
- `navigate(-1)` quando não há rota conhecida

**Se muda de rota → OBRIGATORIAMENTE `<Link>`**
