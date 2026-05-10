// supabase/functions/reset-user-password/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Tentar criar o usuário
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'mariaeduardabmanzi@hotmail.com',
      password: '12345',
      email_confirm: true,
      user_metadata: { full_name: 'Maria Eduarda Borela Manzi' }
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, message: 'Conta criada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
