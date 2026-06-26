// === SYNAPSE: Telegram Query Edge Function ===
// Envia comandos de consulta (CPF, Email, Nome, etc.) para um chat/bot do Telegram
// usando o connector gateway do Lovable. Não armazena dados sensíveis.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

interface RequestBody {
  action: 'sendMessage' | 'getMe' | 'getChat';
  chat_id?: string | number;
  text?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Telegram não configurado no servidor.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.action) {
      return new Response(JSON.stringify({ error: 'action é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let endpoint = '';
    let payload: Record<string, unknown> = {};

    switch (body.action) {
      case 'getMe':
        endpoint = '/getMe';
        break;
      case 'getChat':
        if (!body.chat_id) {
          return new Response(JSON.stringify({ error: 'chat_id obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = '/getChat';
        payload = { chat_id: body.chat_id };
        break;
      case 'sendMessage':
        if (!body.chat_id || !body.text) {
          return new Response(JSON.stringify({ error: 'chat_id e text obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (body.text.length > 4000) {
          return new Response(JSON.stringify({ error: 'Texto muito longo (max 4000)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = '/sendMessage';
        payload = { chat_id: body.chat_id, text: body.text };
        break;
      default:
        return new Response(JSON.stringify({ error: 'action inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || data?.ok === false) {
      return new Response(
        JSON.stringify({ error: data?.description || 'Falha na chamada Telegram', raw: data }),
        { status: res.status || 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true, result: data.result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
