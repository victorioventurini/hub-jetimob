import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de nomes de estados para siglas
const stateNameToAbbr: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO',
};

// Cache das cidades mais acessadas do Brasil (evita chamadas à API)
const popularCities = [
  { city: 'São Paulo', state: 'SP', placeId: 'cached-sp' },
  { city: 'Rio de Janeiro', state: 'RJ', placeId: 'cached-rj' },
  { city: 'Brasília', state: 'DF', placeId: 'cached-bsb' },
  { city: 'Salvador', state: 'BA', placeId: 'cached-ssa' },
  { city: 'Fortaleza', state: 'CE', placeId: 'cached-for' },
  { city: 'Belo Horizonte', state: 'MG', placeId: 'cached-bh' },
  { city: 'Manaus', state: 'AM', placeId: 'cached-mao' },
  { city: 'Curitiba', state: 'PR', placeId: 'cached-cwb' },
  { city: 'Recife', state: 'PE', placeId: 'cached-rec' },
  { city: 'Porto Alegre', state: 'RS', placeId: 'cached-poa' },
  { city: 'Belém', state: 'PA', placeId: 'cached-bel' },
  { city: 'Goiânia', state: 'GO', placeId: 'cached-gyn' },
  { city: 'Guarulhos', state: 'SP', placeId: 'cached-gru' },
  { city: 'Campinas', state: 'SP', placeId: 'cached-vcp' },
  { city: 'São Luís', state: 'MA', placeId: 'cached-slz' },
  { city: 'São Gonçalo', state: 'RJ', placeId: 'cached-sgo' },
  { city: 'Maceió', state: 'AL', placeId: 'cached-mcz' },
  { city: 'Duque de Caxias', state: 'RJ', placeId: 'cached-dqc' },
  { city: 'Natal', state: 'RN', placeId: 'cached-nat' },
  { city: 'Teresina', state: 'PI', placeId: 'cached-the' },
  { city: 'Campo Grande', state: 'MS', placeId: 'cached-cgr' },
  { city: 'São Bernardo do Campo', state: 'SP', placeId: 'cached-sbc' },
  { city: 'João Pessoa', state: 'PB', placeId: 'cached-jpa' },
  { city: 'Santo André', state: 'SP', placeId: 'cached-san' },
  { city: 'Osasco', state: 'SP', placeId: 'cached-osa' },
  { city: 'Ribeirão Preto', state: 'SP', placeId: 'cached-rao' },
  { city: 'Uberlândia', state: 'MG', placeId: 'cached-udi' },
  { city: 'Sorocaba', state: 'SP', placeId: 'cached-sod' },
  { city: 'Contagem', state: 'MG', placeId: 'cached-cnt' },
  { city: 'Aracaju', state: 'SE', placeId: 'cached-aju' },
  { city: 'Feira de Santana', state: 'BA', placeId: 'cached-fes' },
  { city: 'Cuiabá', state: 'MT', placeId: 'cached-cgb' },
  { city: 'Joinville', state: 'SC', placeId: 'cached-joi' },
  { city: 'Juiz de Fora', state: 'MG', placeId: 'cached-jdf' },
  { city: 'Londrina', state: 'PR', placeId: 'cached-ldb' },
  { city: 'Aparecida de Goiânia', state: 'GO', placeId: 'cached-apg' },
  { city: 'Niterói', state: 'RJ', placeId: 'cached-nit' },
  { city: 'Ananindeua', state: 'PA', placeId: 'cached-ann' },
  { city: 'Porto Velho', state: 'RO', placeId: 'cached-pvh' },
  { city: 'Serra', state: 'ES', placeId: 'cached-srr' },
  { city: 'Caxias do Sul', state: 'RS', placeId: 'cached-cxj' },
  { city: 'Florianópolis', state: 'SC', placeId: 'cached-fln' },
  { city: 'Vitória', state: 'ES', placeId: 'cached-vix' },
  { city: 'São José dos Campos', state: 'SP', placeId: 'cached-sjk' },
  { city: 'Macapá', state: 'AP', placeId: 'cached-mcp' },
  { city: 'Rio Branco', state: 'AC', placeId: 'cached-rbr' },
  { city: 'Boa Vista', state: 'RR', placeId: 'cached-bvb' },
  { city: 'Palmas', state: 'TO', placeId: 'cached-pmw' },
];

// Cache em memória para buscas recentes (persiste durante a vida do worker)
const searchCache = new Map<string, { predictions: any[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

function normalizeQuery(query: string): string {
  return query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function searchLocalCache(query: string): any[] {
  const normalized = normalizeQuery(query);
  return popularCities.filter(city => {
    const normalizedCity = normalizeQuery(city.city);
    return normalizedCity.includes(normalized) || normalizedCity.startsWith(normalized);
  }).map(city => ({
    ...city,
    description: `${city.city}, ${city.state}, Brasil`,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = normalizeQuery(query);

    // 1. Verificar cache de buscas recentes
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', query);
      return new Response(JSON.stringify({ predictions: cached.predictions, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar no cache local de cidades populares
    const localResults = searchLocalCache(query);
    if (localResults.length >= 3) {
      console.log('Local cache hit for:', query, '- Found:', localResults.length);
      searchCache.set(cacheKey, { predictions: localResults, timestamp: Date.now() });
      return new Response(JSON.stringify({ predictions: localResults, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Chamar Google API apenas se necessário
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      // Fallback: retornar resultados locais mesmo que poucos
      return new Response(JSON.stringify({ predictions: localResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling Google API for:', query);
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('types', '(cities)');
    url.searchParams.set('components', 'country:br');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API error:', data);
      // Fallback para resultados locais
      return new Response(JSON.stringify({ predictions: localResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const predictions = (data.predictions || []).map((prediction: any) => {
      const parts = prediction.description.split(', ');
      const city = parts[0];
      let state = '';
      
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i].trim();
        if (part.length === 2 && /^[A-Z]{2}$/.test(part)) {
          state = part;
          break;
        }
        if (stateNameToAbbr[part]) {
          state = stateNameToAbbr[part];
          break;
        }
      }

      return {
        city,
        state,
        placeId: prediction.place_id,
        description: prediction.description,
      };
    });

    // Salvar no cache
    searchCache.set(cacheKey, { predictions, timestamp: Date.now() });
    console.log('Cached results for:', query);

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-cities:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
