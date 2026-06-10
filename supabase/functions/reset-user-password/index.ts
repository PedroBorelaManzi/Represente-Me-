import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, message: 'E-mail e código são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && userData?.users) {
        const exists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!exists) {
          console.warn('Tentativa bloqueada de reset para e-mail não existente:', email);
          return new Response(JSON.stringify({ success: true, message: 'Se o e-mail existir, enviaremos um código em instantes.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY não configurada. E-mail simulado no log do servidor. Código:", code)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'E-mail simulado com sucesso (RESEND_API_KEY ausente).', 
          demoMode: true,
          code
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Chamada para a API do Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Represente-Me <onboarding@resend.dev>',
        to: email,
        subject: 'Código de Segurança - Represente-Me',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #059669; font-weight: 900; margin: 0; font-size: 24px; letter-spacing: -0.025em; text-transform: uppercase;">Represente-Me</h2>
              <p style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px;">Segurança da Conta</p>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 14px; font-weight: 600; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
                Olá,
              </p>
              <p style="font-size: 14px; font-weight: 600; color: #475569; line-height: 1.5; margin: 0 0 24px 0;">
                Recebemos uma solicitação de alteração de senha na sua conta. Insira o código abaixo para validar sua identidade e prosseguir com a alteração:
              </p>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #ffffff; border: 2px dashed #e2e8f0; border-radius: 8px; font-size: 32px; font-weight: 900; color: #0f172a; padding: 12px 32px; letter-spacing: 0.25em;">
                  ${code}
                </span>
              </div>
              
              <p style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; text-align: center;">
                Este código expira em 10 minutos.
              </p>
            </div>
            
            <p style="font-size: 12px; font-weight: 500; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
              Se você não solicitou essa alteração, nenhuma ação é necessária e você pode ignorar este e-mail com segurança.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 16px;" />
            
            <div style="text-align: center;">
              <p style="font-size: 9px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin: 0;">
                Represente-Me — Tecnologia de Ponta
              </p>
            </div>
          </div>
        `
      })
    })

    const resData = await res.json()

    if (!res.ok) {
      console.error("Erro do Resend:", resData)
      throw new Error(resData.message || "Falha ao enviar e-mail pelo Resend.")
    }

    return new Response(JSON.stringify({ success: true, message: 'E-mail enviado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
