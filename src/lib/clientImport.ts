import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import OpenAI from "openai";

// Definindo o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Extrai CNPJs únicos de uma string de texto internamente usando Regex (fallback blindado a espaços irregulares)
 */
export function extractCnpjs(text: string): string[] {
  const cnpjRegex = /\d{2}[\.\s]*\d{3}[\.\s]*\d{3}[\/\s]*\d{4}[\-\s]*\d{2}/g;
  const matches = text.match(cnpjRegex) || [];
  const uniqueCnpjs = Array.from(new Set(matches.map(cnpj => cnpj.replace(/\D/g, ''))));
  return uniqueCnpjs.filter(cnpj => cnpj.length === 14);
}

/**
 * Identifica o tipo real do arquivo lendo a assinatura em ArrayBuffer
 */
async function detectFileType(file: File): Promise<{ type: 'pdf' | 'excel' | 'image' | 'text' | 'unknown', mimeType?: string }> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { type: 'pdf', mimeType: 'application/pdf' };
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { type: 'excel' };
    }
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      return { type: 'excel' };
    }
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { type: 'image', mimeType: 'image/jpeg' };
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { type: 'image', mimeType: 'image/png' };
    }
    
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return { type: 'excel' };
    if (name.endsWith('.txt')) return { type: 'text' };
    
    return { type: 'unknown' };
  } catch (e) {
    return { type: 'unknown' };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error("Erro ao ler arquivo como base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Processa a IA usando OpenAI GPT-4o
 */
async function processWithOpenAI(file: File): Promise<string[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API da OpenAI não configurada");
  }

  const prompt = `ATENÇÃO: Este é um documento contendo informações fiscais/corporativas.
Você é uma ferramenta de OCR analítico altamente capacitada. 
Eu preciso que você avalie CADA página ou linha e extraia TODOS os números de CNPJ (14 dígitos, formato: XX.XXX.XXX/YYYY-ZZ) contidos.
Se houver CPFs (11 dígitos), IEs ou RGs, ignore-os completamente. O foco é identificar os CNPJs válidos de empresas descritas no texto. 

Você DEVE retornar APENAS um Array JSON perfeitamente válido contendo todos os CNPJs localizados. Só as strings com os 14 dígitos formatadas sem os numerais (exatamente os números omitindo pontuações, traços, etc).
Não adicione explicações, nem avisos ou formatações markdown. Apenas o array.
Exemplo do retorno esperado exato: ["12345678000199", "98765432000111"]`;

  const detected = await detectFileType(file);
  let content: any[] = [{ type: "text", text: prompt }];

  if (detected.type === 'excel') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
      fullText += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n';
    });
    content.push({ type: "text", text: "Conteúdo do Excel:\n" + fullText });
  } else if (detected.type === 'image') {
    const base64 = await fileToBase64(file);
    content.push({
      type: "image_url",
      image_url: { url: `data:${detected.mimeType};base64,${base64}` }
    });
  } else {
    // PDF or Text
    let text = "";
    if (detected.type === 'pdf') {
       text = (await extractTextFromPDF(file)).join('\n');
    } else {
       text = await file.text();
    }
    content.push({ type: "text", text: "Texto extraído:\n" + text });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" }
    });

    const resText = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(resText);
    const cnpjs = Array.isArray(parsed) ? parsed : (parsed.cnpjs || []);
    
    return cnpjs.map(String).map(s => s.replace(/\D/g, '')).filter(s => s.length === 14);
  } catch (error: any) {
    console.error("Erro na OpenAI:", error);
    if (detected.type === 'pdf') return extractCnpjsFallbackFromPDF(file);
    throw new Error("Erro Crítico na IA de Importação (OpenAI): " + error.message);
  }
}

async function extractTextFromPDF(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pagesText: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pagesText.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pagesText;
}

async function extractCnpjsFallbackFromPDF(file: File): Promise<string[]> {
  const texts = await extractTextFromPDF(file);
  const fullText = texts.join('\n');
  const results = extractCnpjs(fullText);
  if (results.length === 0) throw new Error("Nenhum CNPJ detectado no PDF.");
  return results;
}

export async function parseFileForCnpjs(file: File): Promise<string[]> {
  try {
    const cnpjs = await processWithOpenAI(file);
    return Array.from(new Set(cnpjs));
  } catch (error: any) {
    console.error('Erro no parse do CNPJ:', error);
    throw new Error(error.message || 'Falha na leitura do arquivo.');
  }
}
