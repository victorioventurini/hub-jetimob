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

serve(async (req) => {
  // Handle CORS preflight requests
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

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    // Buscar cidades brasileiras usando Place Autocomplete
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    url.searchParams.set('types', '(cities)');
    url.searchParams.set('components', 'country:br');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('key', apiKey);

    console.log('Searching cities for:', query);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API error:', data);
      throw new Error(`Google API error: ${data.status}`);
    }

    // Formatar resultados
    const predictions = (data.predictions || []).map((prediction: any) => {
      // Extrair cidade e estado da descrição
      // Formato típico: "Porto Alegre, RS, Brasil"
      const parts = prediction.description.split(', ');
      const city = parts[0];
      
      // Tentar encontrar o estado (pode ser sigla ou nome completo)
      let state = '';
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i].trim();
        // Se já é uma sigla de 2 letras
        if (part.length === 2 && /^[A-Z]{2}$/.test(part)) {
          state = part;
          break;
        }
        // Se é um nome de estado completo
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

    console.log('Found cities:', predictions.length);

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
