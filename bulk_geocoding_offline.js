import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const INPUT_FILE = 'C:/Users/Pedro/.gemini/antigravity/brain/9d16d0f8-55f0-46f5-a2e5-78be7aed06d7/clients_data.json';
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
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Erro ao processar ${client.name}:`, err.message);
    if (err.message.includes('429')) return { error: 'rate_limit' };
    return { error: err.message };
  }
}

async function run() {
  console.log('--- Iniciando Auditoria Offline v1 ---');
  
  const clients = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  
  let auditResults = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try { auditResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch (e) {}
  }
  const processedIds = new Set(auditResults.map(r => r.id));

  console.log(`Clientes no JSON: ${clients.length}. Processados: ${processedIds.size}`);

  const toProcess = clients.filter(c => !processedIds.has(c.id));

  for (let i = 0; i < toProcess.length; i++) {
    const client = toProcess[i];
    console.log(`[${i+1}/${toProcess.length}] ${client.name}...`);
    const result = await geocodeClient(client);
    
    if (result.error === 'rate_limit') {
      console.log('Aguardando 60s...'); await new Promise(r => setTimeout(r, 60000));
      i--; continue;
    }

    auditResults.push({ id: client.id, name: client.name, ...result, timestamp: new Date().toISOString() });
    
    if (i % 5 === 0 || i === toProcess.length - 1) {
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(auditResults, null, 2));
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
