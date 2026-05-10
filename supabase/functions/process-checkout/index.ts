// supabase/functions/process-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_API_URL = 'https://www.asaas.com/api/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { planId, billingCycle, paymentMethod, customer, creditCard, finalPrice } = body

    console.log('Recebido:', { planId, billingCycle, paymentMethod, email: customer.email })

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ success: false, message: 'Chave API Asaas não encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const cleanCpf = customer.cpfCnpj.replace(/\D/g, '')
    const cleanPhone = customer.phone.replace(/\D/g, '')

    // 1. Garantir Cliente no Asaas
    let asaasCustomerId = null
    try {
        const customerResp = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(customer.email)}`, {
          headers: { 'access_token': ASAAS_API_KEY }
        })
        const customers = await customerResp.json()
        asaasCustomerId = customers.data?.[0]?.id
    } catch (e) {}

    if (!asaasCustomerId) {
      const newCustomerResp = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          cpfCnpj: cleanCpf,
          mobilePhone: cleanPhone,
          notificationDisabled: true
        })
      })
      const newCustomer = await newCustomerResp.json()
      if (newCustomer.errors) {
        return new Response(JSON.stringify({ success: false, message: `Asaas Cliente: ${newCustomer.errors[0].description}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }
      asaasCustomerId = newCustomer.id
    }

    // 2. Processar Pagamento ou Assinatura
    const endpoint = billingCycle === 'SUBSCRIPTION' ? '/subscriptions' : '/payments'
    
    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod,
      value: Number(finalPrice),
      description: `Plano ${planId} - ${billingCycle === 'SUBSCRIPTION' ? 'Mensalidade' : 'Anual à Vista'}`,
    }

    if (billingCycle === 'SUBSCRIPTION') {
      paymentBody.cycle = 'MONTHLY'
      paymentBody.nextDueDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0] // Começa amanhã
    } else {
      paymentBody.dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]
    }

    if (paymentMethod === 'CREDIT_CARD' && creditCard) {
      paymentBody.creditCard = creditCard
      paymentBody.creditCardHolderInfo = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: cleanCpf,
        postalCode: '01310-930',
        addressNumber: '1',
        phone: cleanPhone
      }
      paymentBody.remoteIp = '127.0.0.1'
    }

    const resp = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(paymentBody)
    })

    const data = await resp.json()

    if (data.errors) {
      return new Response(JSON.stringify({ success: false, message: data.errors[0].description }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceUrl: data.invoiceUrl || data.bankSlipUrl || data.pixQrCode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ success: false, message: 'Erro interno.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
