// supabase/functions/process-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_API_URL = 'https://www.asaas.com/api/v3' // Use sandbox.asaas.com for testing

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, paymentMethod, customer, creditCard } = await req.json()

    // 1. Find or Create Customer
    const customerResp = await fetch(`${ASAAS_API_URL}/customers?email=${customer.email}`, {
      headers: { 'access_token': ASAAS_API_KEY! }
    })
    const customers = await customerResp.json()
    let asaasCustomerId = customers.data?.[0]?.id

    if (!asaasCustomerId) {
      const newCustomerResp = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY! },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpfCnpj,
          mobilePhone: customer.phone
        })
      })
      const newCustomer = await newCustomerResp.json()
      asaasCustomerId = newCustomer.id
    }

    // 2. Create Payment/Subscription
    const paymentBody = {
      customer: asaasCustomerId,
      billingType: paymentMethod,
      value: plan === 'exclusivo' ? 97 : plan === 'profissional' ? 147 : 197,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 days from now
      description: `Plano ${plan} - Represente-Me`,
      creditCard: creditCard,
      creditCardHolderInfo: creditCard ? {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        postalCode: '01001000', // Mock or get from user
        addressNumber: '1',
        phone: customer.phone
      } : null
    }

    const paymentResp = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY! },
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
      invoiceUrl: paymentData.invoiceUrl,
      pixCode: paymentData.pixQrCode // If applicable
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
