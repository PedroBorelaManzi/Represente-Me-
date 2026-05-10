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

    // Limpeza de dados (apenas números para CPF e Telefone)
    const cleanCpfCnpj = customer.cpfCnpj.replace(/\D/g, '')
    const cleanPhone = customer.phone.replace(/\D/g, '')

    console.log('Checkout iniciado:', { plan, paymentMethod, email: customer.email, finalPrice })

    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY ausente')

    // 1. Cliente
    let asaasCustomerId = null
    const customerResp = await fetch(`${ASAAS_API_URL}/customers?email=${customer.email}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    })
    const customers = await customerResp.json()
    asaasCustomerId = customers.data?.[0]?.id

    if (!asaasCustomerId) {
      const newCustomerResp = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          cpfCnpj: cleanCpfCnpj,
          mobilePhone: cleanPhone,
          notificationDisabled: true
        })
      })
      const newCustomer = await newCustomerResp.json()
      if (newCustomer.errors) throw new Error(newCustomer.errors[0].description)
      asaasCustomerId = newCustomer.id
    }

    // 2. Pagamento
    const price = Number(finalPrice)
    if (paymentMethod === 'CREDIT_CARD' && price < 5) {
      throw new Error('O valor mínimo para cartão de crédito é R$ 5,00. Por favor, remova o cupom ou use outro método.')
    }

    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod,
      value: price,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      description: `Represente-Me: Plano ${plan}`,
      externalReference: `ref_${Date.now()}`,
    }

    if (paymentMethod === 'CREDIT_CARD' && creditCard) {
      paymentBody.creditCard = creditCard
      paymentBody.creditCardHolderInfo = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: cleanCpfCnpj,
        postalCode: '01310-930',
        addressNumber: '1',
        phone: cleanPhone
      }
      paymentBody.remoteIp = req.headers.get('x-forwarded-for') || '127.0.0.1'
    }

    const paymentResp = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(paymentBody)
    })

    const paymentData = await paymentResp.json()

    if (paymentData.errors) {
      return new Response(JSON.stringify({ success: false, message: paymentData.errors[0].description }), {
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
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
