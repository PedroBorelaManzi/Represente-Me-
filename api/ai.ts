export const config = {
  runtime: 'edge',
};

// In-memory rate limiting for Edge Functions (Per Edge region)
// Map of userId -> { count, resetAt }
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_REQ_PER_MIN = 10;

export default async function handler(req: Request) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
    }

    // Call Supabase to verify the token
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
       return new Response(JSON.stringify({ error: 'Supabase URL/Key not configured' }), { status: 500, headers: corsHeaders });
    }

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    const userData = await authRes.json();
    const userId = userData.id;

    // Rate Limiting
    const now = Date.now();
    const userRate = rateLimit.get(userId) || { count: 0, resetAt: now + 60000 };
    
    if (now > userRate.resetAt) {
      userRate.count = 1;
      userRate.resetAt = now + 60000;
    } else {
      userRate.count++;
    }
    rateLimit.set(userId, userRate);

    if (userRate.count > MAX_REQ_PER_MIN) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), { status: 429, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, payload } = body;

    if (action === 'geocode') {
      const { address, name, cnpj } = payload;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500, headers: corsHeaders });
      }

      const prompt = `INSTRUTIVO DE PESQUISA PROFUNDA (DEEP SEARCH):
Você deve localizar as coordenadas geográficas exatas (Latitude e Longitude) para esta empresa brasileira.

DADOS RECEBIDOS:
Nome: ${name || "Não informado"}
CNPJ: ${cnpj || "Não informado"}
Endereço Parcial: ${address || "Não informado"}

SUA MISSÃO:
1. Use seus recursos internos para pesquisar o endereço oficial desta empresa pelo CNPJ/Nome.
2. Tente identificar a localização no Google Maps.
3. Retorne a localização do prédio/sede exata se possível.
4. Se não encontrar o prédio, use o centro da rua.
5. Se for impossível determinar a rua, retorne null.

FORMATO DE RESPOSTA (APENAS JSON):
{"lat": -00.00000, "lng": -00.00000}

Nota: Não invente coordenadas. Se não tiver certeza mínima da cidade, retorne null.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Gemini API call failed' }), { status: 502, headers: corsHeaders });
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let cleanJson = responseText.trim();
      if (responseText.includes("{")) {
         cleanJson = responseText.substring(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1);
      }
      
      try {
        const coords = JSON.parse(cleanJson);
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          return new Response(JSON.stringify(coords), { status: 200, headers: corsHeaders });
        }
      } catch (e) {
        // failed to parse
      }

      return new Response(JSON.stringify(null), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
