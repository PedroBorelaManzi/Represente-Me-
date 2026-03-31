import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const RESULTS_FILE = 'geocoding_audit_results.json';

async function geocodeClient(client) {
  const prompt = `Atue como um especialista em geolocalização de alta precisão.
Busque as coordenadas exatas (latitude e longitude) para este cliente:
Nome: ${client.name}
Endereço: ${client.address || ''}, ${client.city || ''}, ${client.state || ''}
CNPJ: ${client.cnpj || ''}

IMPORTANTE: 
1. Se o endereço estiver incompleto, use o nome da empresa e a cidade para encontrar o local real no Google Maps.
2. Responda APENAS um objeto JSON válido no formato: {"lat": -23.123, "lng": -47.123, "precision": "high/medium/low", "notes": "motivo se a precisão for baixa"}.
3. Não inclua Markdown, blocos de código ou texto adicional.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean potential markdown blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (err) {
    console.error(`Erro ao processar ${client.name}:`, err.message);
    if (err.message.includes('429')) return { error: 'rate_limit' };
    return { error: err.message };
  }
}

async function run() {
  console.log('--- Iniciando Auditoria de Geolocalização (Versão Corrigida) ---');
  
  // Load existing results to avoid duplications
  let auditResults = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      auditResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    } catch (e) {
      auditResults = [];
    }
  }
  const processedIds = new Set(auditResults.map(r => r.id));

  // Get all clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, address, city, state, cnpj')
    .order('name');

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return;
  }

  console.log(`Total de clientes: ${clients.length}. Já processados: ${processedIds.size}`);

  const toProcess = clients.filter(c => !processedIds.has(c.id));
  console.log(`Clientes restantes: ${toProcess.length}`);

  for (let i = 0; i < toProcess.length; i++) {
    const client = toProcess[i];
    console.log(`[${i+1}/${toProcess.length}] Processando: ${client.name}...`);
    
    const result = await geocodeClient(client);
    
    if (result.error === 'rate_limit') {
      console.log('Rate limit atingido. Aguardando 60 segundos...');
      await new Promise(r => setTimeout(r, 60000));
      i--; // Retry this client
      continue;
    }

    auditResults.push({
      id: client.id,
      name: client.name,
      ...result,
      timestamp: new Date().toISOString()
    });

    // Save every 5 clients or at the end
    if (i % 5 === 0 || i === toProcess.length - 1) {
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(auditResults, null, 2));
      console.log(`-> Progresso salvo (${auditResults.length} totais)`);
    }

    // Small delay to be polite to the API
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('--- Auditoria Concluída! ---');
}

run();
