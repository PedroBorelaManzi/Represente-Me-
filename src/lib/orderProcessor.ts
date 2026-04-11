import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export interface ProcessedOrder {
  success: boolean;
  clientName?: string;
  totalAmount?: number;
  category?: string;
  error?: string;
}

export async function processOrderFile(file: File, userId: string): Promise<ProcessedOrder> {
  try {
    const text = await readFileAsText(file);
    
    // Extração básica via Regex para ajudar a IA / Fallback
    const localCnpj = extractCnpj(text);
    const localValue = extractTotalValue(text);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Você é um assistente de extração de dados de pedidos comerciais.
      Analise o texto abaixo e extraia com precisão:
      1. Razão Social ou Nome Fantasia do CLIENTE (Destinatário)
      2. CNPJ do Cliente (Somente números)
      3. Valor Total Líquido do Pedido (Somente números, use ponto para decimais)
      4. A categoria principal do pedido (ex: Bebidas, Alimentos, Higiene)

      HINTS LOCAIS (Extraídos via Regex):
      - CNPJ detectado: ${localCnpj || "Não detectado"}
      - Valor provável: ${localValue || "Não detectado"}

      CONTEÚDO DO DOCUMENTO:
      ${text.substring(0, 10000)}

      Responda APENAS em JSON no formato:
      {"clientName": "string", "cnpj": "string", "totalAmount": number, "category": "string"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);

    if (!data.cnpj) throw new Error("CNPJ não identificado no documento.");

    // 1. Verificar se o cliente já existe
    let { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('cnpj', data.cnpj.replace(/\D/g, ''))
      .eq('user_id', userId)
      .single();

    if (!client) {
      // Registrar novo cliente se não existir
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([{
          user_id: userId,
          name: data.clientName || `Novo Cliente ${data.cnpj.substring(0, 4)}`,
          cnpj: data.cnpj.replace(/\D/g, ''),
          status: 'Ativo',
          last_contact: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
      
      if (clientError) throw clientError;
      client = newClient;
    }

    // 2. Registrar o pedido
    const { error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        client_id: client.id,
        file_name: file.name,
        total_amount: data.totalAmount || 0,
        company_name: data.category || 'Geral'
      }]);

    if (orderError) throw orderError;

    return {
      success: true,
      clientName: client.name,
      totalAmount: data.totalAmount,
      category: data.category
    };

  } catch (error: any) {
    console.error('Erro no processamento IA:', error);
    return { success: false, error: error.message };
  }
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function extractCnpj(text: string): string | null {
  const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  return match ? match[0].replace(/\D/g, '') : null;
}

function extractTotalValue(text: string): string | null {
  const valueRegex = /(?:total|líquido|valor).*?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i;
  const match = text.match(valueRegex);
  return match ? match[1] : null;
}
