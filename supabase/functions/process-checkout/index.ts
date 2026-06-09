// supabase/functions/process-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_API_URL = 'https://www.asaas.com/api/v3'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const PLAN_PRICES = {
  'exclusivo': { MONTHLY: 97, SEMIANNUAL: 77, ANNUAL: 67 },
  'profissional': { MONTHLY: 147, SEMIANNUAL: 117, ANNUAL: 107 },
  'master': { MONTHLY: 197, SEMIANNUAL: 157, ANNUAL: 137 },
  'default': { MONTHLY: 147, SEMIANNUAL: 117, ANNUAL: 107 }
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const { action, userId, planId, billingCycle, paymentMethod, coupon, customer = {}, creditCard } = body

    if (!customer.email || !customer.cpfCnpj || !customer.phone || !customer.name) {
      return new Response(JSON.stringify({ success: false, message: 'Dados do formulário incompletos ou em branco.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log('Recebido:', { planId, billingCycle, paymentMethod, email: customer.email })

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ success: false, message: 'Chave API Asaas não encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const cleanCpf = customer.cpfCnpj.replace(/\D/g, '')
    const cleanPhone = customer.phone.replace(/\D/g, '')

    // Ação rápida de verificação de duplicidade antes do pagamento
    if (action === 'check-uniqueness') {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
          const { data: userData, error: listError } = await supabase.auth.admin.listUsers()
          
          if (!listError && userData?.users) {
            for (const u of userData.users) {
              if (u.id === userId) continue;
              
              if (u.email?.toLowerCase() === customer.email.toLowerCase()) {
                return new Response(JSON.stringify({ success: false, message: 'Este e-mail já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                })
              }
              
              const uCpf = (u.user_metadata?.cpf_cnpj || '').replace(/\D/g, '')
              if (uCpf && uCpf === cleanCpf) {
                return new Response(JSON.stringify({ success: false, message: 'Este CPF/CNPJ já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                })
              }
              
              const uPhone = (u.user_metadata?.phone || '').replace(/\D/g, '')
              if (uPhone && uPhone === cleanPhone) {
                return new Response(JSON.stringify({ success: false, message: 'Este número de WhatsApp já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                })
              }

              const uName = (u.user_metadata?.name || '').trim().toLowerCase()
              const searchName = (customer.name || '').trim().toLowerCase()
              if (uName && searchName && uName === searchName) {
                return new Response(JSON.stringify({ success: false, message: 'Este nome completo já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                })
              }
            }
          }
        } catch (authCheckErr) {
          console.error('Erro na verificação de duplicidade de Auth:', authCheckErr)
        }
      }

      if (ASAAS_API_KEY) {
        try {
          const cpfResp = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}`, {
            headers: { 'access_token': ASAAS_API_KEY }
          })
          const cpfCustomers = await cpfResp.json()
          if (cpfCustomers.data && cpfCustomers.data.length > 0) {
            const existingCpfCust = cpfCustomers.data[0];
            if (existingCpfCust.email?.toLowerCase() !== customer.email.toLowerCase()) {
              return new Response(JSON.stringify({ success: false, message: 'Este CPF/CNPJ já possui uma conta de faturamento cadastrada. Por favor, utilize o e-mail original ou fale com o suporte.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              })
            }
          }
        } catch (asaasCheckErr) {
          console.error('Erro na verificação de duplicidade do Asaas:', asaasCheckErr)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Verificação de Duplicidade no Supabase Auth (via service role key)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { data: userData, error: listError } = await supabase.auth.admin.listUsers()
        
        if (!listError && userData?.users) {
          for (const u of userData.users) {
            if (u.id === userId) continue;
            
            if (u.email?.toLowerCase() === customer.email.toLowerCase()) {
              return new Response(JSON.stringify({ success: false, message: 'Este e-mail já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              })
            }
            
            const uCpf = (u.user_metadata?.cpf_cnpj || '').replace(/\D/g, '')
            if (uCpf && uCpf === cleanCpf) {
              return new Response(JSON.stringify({ success: false, message: 'Este CPF/CNPJ já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              })
            }
            
const uPhone = (u.user_metadata?.phone || '').replace(/\D/g, '')
            if (uPhone && uPhone === cleanPhone) {
              return new Response(JSON.stringify({ success: false, message: 'Este número de WhatsApp já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              })
            }

            const uName = (u.user_metadata?.name || '').trim().toLowerCase()
            const searchName = (customer.name || '').trim().toLowerCase()
            if (uName && searchName && uName === searchName) {
              return new Response(JSON.stringify({ success: false, message: 'Este nome completo já está cadastrado no sistema. Cada pessoa pode ter apenas uma conta.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              })
            }
          }
        }
      } catch (authCheckErr) {
        console.error('Erro na verificação de duplicidade de Auth:', authCheckErr)
      }
    }

    // Verificação de Duplicidade no Asaas (CPF/CNPJ)
    try {
      const cpfResp = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      })
      const cpfCustomers = await cpfResp.json()
      if (cpfCustomers.data && cpfCustomers.data.length > 0) {
        const existingCpfCust = cpfCustomers.data[0];
        if (existingCpfCust.email?.toLowerCase() !== customer.email.toLowerCase()) {
          return new Response(JSON.stringify({ success: false, message: 'Este CPF/CNPJ já possui uma conta de faturamento cadastrada. Por favor, utilize o e-mail original ou fale com o suporte.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          })
        }
      }
    } catch (asaasCheckErr) {
      console.error('Erro na verificação de duplicidade do Asaas:', asaasCheckErr)
    }

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

    // 2. Processar Pagamento ou Assinatura (Gym-style)
    // - MONTHLY: Assinatura recorrente mensal (cancelável)
    // - SEMIANNUAL / ANNUAL: Pagamento único parcelado (compromisso fixo)
    
    
    const pricing = PLAN_PRICES[planId] || PLAN_PRICES['default'];
    const monthlyRate = pricing[billingCycle] || pricing.ANNUAL;
    let baseValue = monthlyRate;
    if (billingCycle === 'ANNUAL') baseValue = monthlyRate * 12;
    if (billingCycle === 'SEMIANNUAL') baseValue = monthlyRate * 6;

    let couponDiscount = 0;
    if (coupon === 'REPRESENTE95') couponDiscount = (baseValue * 95) / 100;
    else if (coupon === 'TESTE') couponDiscount = (baseValue * 50) / 100;

    let priceAfterCoupon = baseValue - couponDiscount;
    let pixDiscount = paymentMethod === 'PIX' ? (priceAfterCoupon * 5) / 100 : 0;
    let serverFinalPrice = priceAfterCoupon - pixDiscount;
    // Arredondar para duas casas decimais no Asaas
    serverFinalPrice = Math.round(serverFinalPrice * 100) / 100;

    let endpoint = '/subscriptions'
    const paymentBody: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod,
      value: serverFinalPrice,
      externalReference: userId,
      description: `Plano ${planId} - ${billingCycle}`,
    }

    if (billingCycle === 'MONTHLY') {
      paymentBody.cycle = 'MONTHLY'
      paymentBody.nextDueDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0]
    } else {
      // Para Anual e Semestral, usamos o endpoint de pagamentos com parcelamento
      endpoint = '/payments'
      paymentBody.dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]
      
      if (paymentMethod === 'CREDIT_CARD') {
        paymentBody.installmentCount = billingCycle === 'ANNUAL' ? 12 : 6
        // O valor enviado no Asaas para 'payments' parcelados é o TOTAL
        // O Asaas dividirá automaticamente em 12x ou 6x
      }
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
