// supabase/functions/process-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_API_URL = 'https://www.asaas.com/api/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { plan, paymentMethod, customer, creditCard, finalPrice } = body

    console.log('Iniciando processamento de checkout:', { plan, paymentMethod, email: customer.email, finalPrice })

    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não configurada no Supabase')
    }

    // 1. Buscar ou Criar Cliente
    let asaasCustomerId = null
    try {
      const customerResp = await fetch(`${ASAAS_API_URL}/customers?email=${customer.email}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      })
      const customers = await customerResp.json()
      asaasCustomerId = customers.data?.[0]?.id
    } catch (e) {
      console.error('Erro ao buscar cliente:', e)
    }

    if (!asaasCustomerId) {
      const newCustomerResp = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpfCnpj,
          mobilePhone: customer.phone,
          notificationDisabled: true
        })
      })
      const newCustomer = await newCustomerResp.json()
      if (newCustomer.errors) {
        return new Response(JSON.stringify({ success: false, message: `Erro Asaas (Cliente): ${newCustomer.errors[0].description}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }
      asaasCustomerId = newCustomer.id
    }

    // 2. Criar Pagamento
    // Usamos o finalPrice enviado pelo frontend (que já tem descontos/bumps aplicados)
    const price = finalPrice || (plan === 'exclusivo' ? 97 : plan === 'profissional' ? 147 : 197)

    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod,
      value: price,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      description: `Assinatura ${plan} - Represente-Me`,
      externalReference: `plan_${plan}_${Date.now()}`,
    }

    if (paymentMethod === 'CREDIT_CARD' && creditCard) {
      paymentBody.creditCard = creditCard
      paymentBody.creditCardHolderInfo = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        postalCode: '01310-930', // Paulista, SP (Default para teste se não houver campo)
        addressNumber: '1',
        phone: customer.phone
      }
      // Opcional: remoteIp para segurança
      paymentBody.remoteIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '127.0.0.1'
    }

    const paymentResp = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(paymentBody)
    })

    const paymentData = await paymentResp.json()

    if (paymentData.errors) {
      console.error('Erros do Asaas:', paymentData.errors)
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Erro Asaas: ${paymentData.errors[0].description}`,
        details: paymentData.errors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceUrl: paymentData.invoiceUrl || paymentData.bankSlipUrl,
      paymentId: paymentData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro fatal na Edge Function:', error)
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
