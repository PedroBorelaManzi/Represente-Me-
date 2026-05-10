// supabase/functions/regularize-subscription/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_API_URL = 'https://www.asaas.com/api/v3'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const PLAN_PRICES: Record<string, number> = {
  'exclusivo': 97,
  'profissional': 147,
  'corporativo': 197,
  'default': 147
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('UserId não fornecido')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Buscar dados do usuário (Auth e Settings)
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !user) throw new Error('Usuário não encontrado no sistema')

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 2. Buscar APENAS o cliente existente no Asaas pelo e-mail
    const searchResp = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(user.email!)}`, {
      headers: { 'access_token': ASAAS_API_KEY! }
    })
    const searchData = await searchResp.json()
    const asaasCustomerId = searchData.data?.[0]?.id

    if (!asaasCustomerId) {
      throw new Error(`Cliente não encontrado no sistema de pagamento para o e-mail: ${user.email}`)
    }

    // 3. Cálculo do Valor (Mensalidade + Multa de R$ 30)
    const planId = settings?.plan_id || 'profissional'
    const baseValue = PLAN_PRICES[planId] || PLAN_PRICES['default']
    const totalToPay = baseValue + 30

    // 4. Gerar Cobrança de Regularização
    const paymentResp = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY! },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: totalToPay,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Regularização Represente-Me (Plano ${planId} + Taxa de Reativação R$ 30,00)`,
        externalReference: `REG_${userId}`
      })
    })

    const paymentData = await paymentResp.json()
    if (paymentData.errors) throw new Error(paymentData.errors[0].description)

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceUrl: paymentData.invoiceUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Erro na Regularização:', error.message)
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
