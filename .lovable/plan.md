# Localização: garantir "Brasília, DF" (e demais capitais) nos resultados

## Contexto

O campo "Localização" usa `CityAutocomplete` → edge function `search-cities`, que combina:
1. Cache local de ~50 capitais/cidades populares (inclui `Brasília / DF`)
2. Google Places Autocomplete (`types=(cities)`, `country:br`)

Hoje a função só retorna o cache local quando ele tem **3 ou mais matches** (`if (localResults.length >= 3)`). Para `"brasilia"` só existe 1 match local (`Brasília, DF`), então cai no fallback do Google, que devolve apenas distritos/regiões (`Brasília – Plano Piloto`, `Brasília de Minas, MG`, `Brasília Legal`, …) — e `Brasília, DF` some da lista. O mesmo acontece com outras capitais que tenham bairros/distritos famosos.

## Workaround imediato (sem código)

Digitar `plano piloto` e selecionar `Brasília – Plano Piloto` (resolve para DF). Ou usar a primeira opção mesmo — apesar do rótulo, o `place_id` é Brasília/DF.

## Correção definitiva (1 arquivo)

`supabase/functions/search-cities/index.ts`: mudar estratégia de "ou/ou" para "sempre mesclar":

1. Remover o early-return quando `localResults.length >= 3`.
2. Sempre executar a busca no Google (quando houver chave).
3. Mesclar `localResults` (prepended) + `googleResults`, deduplicando por `city+state` normalizado, limitando a 8.
4. Se Google falhar/indisponível, manter fallback atual (retornar `localResults`).

Resultado: `brasilia` → `Brasília, DF` no topo, seguido das opções do Google. Idem para `são paulo`, `rio`, etc.

## Detalhes técnicos

- Dedupe key: `normalizeQuery(city) + "|" + state.toUpperCase()`.
- Cache em memória (`searchCache`) guarda o array já mesclado, TTL 1h.
- CORS, validação Zod, `verify_jwt=false`, logs estruturados — preservados (conforme Edge Function Standard).
- Sem mudanças em frontend, schema, RLS, query keys ou tipos.

## Validação

1. Onde o `CityAutocomplete` é usado → digitar `brasilia` → primeira opção `Brasília, DF`.
2. `são paulo` → `São Paulo, SP` no topo.
3. Cidade fora do cache (ex.: `pirassununga`) → continua via Google.
4. Sem chave Google ativa → fallback só cache local preservado.
