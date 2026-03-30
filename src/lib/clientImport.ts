import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Definindo o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

/**
 * Extrai CNPJs únicos de uma string de texto internamente usando Regex (fallback)
 */
export function extractCnpjs(text: string): string[] {
  const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
  const matches = text.match(cnpjRegex) || [];
  const uniqueCnpjs = Array.from(new Set(matches.map(cnpj => cnpj.replace(/\D/g, ''))));
  return uniqueCnpjs.filter(cnpj => cnpj.length === 14);
}

/**
 * Converte um arquivo para Base64
 */
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
 * Processa a inteligência artificial para o formato de array de CNPJs
 */
async function processWithGemini(file: File): Promise<string[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API do Gemini não configurada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `ATENÇÃO: Este é um documento/arquivo contendo informações sobre empresas ou clientes.
Lembre-se que você funciona como uma ferramenta de OCR analítico altamente capacitada. 
Eu preciso que você extraia rigorosamente TODOS e QUALQUER número de CNPJ (14 dígitos, formato: XX.XXX.XXX/YYYY-ZZ) contidos nas tabelas, textos, recibos, fotos ou formulários deste documento.
Se houver CPFs (11 dígitos) ou IEs, ignore-os. Concentre-se no escopo estrito de localizar CNPJs válidos de empresas. 

Você DEVE retornar APENAS um Array JSON perfeitamente válido contendo os CNPJs como strings de 14 dígitos (apenas os números, omitindo as pontuações e quebras).
Não retorne NENHUM outro texto extra, nem explicações. Nenhum markdown como \`\`\`json. Apenas o array de strings em uma única linha.
Exemplo do retorno esperado exato: ["12345678000199", "98765432000111", "12312312000112"]`;

  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Se for Excel/CSV, vamos ler o texto primeiro usando XLSX para passar como texto para o Gemini, 
  // pois é mais econômico e assertivo do que enviar binários de Excel.
  if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      fullText += XLSX.utils.sheet_to_csv(sheet) + '\n';
    });
    
    const result = await model.generateContent([prompt, fullText]);
    const response = await result.response;
    const textRes = response.text();
    return parseGeminiJsonResponse(textRes, fullText);
  }
  
  // Se for texto plano
  if (extension === 'txt') {
    const textRaw = await file.text();
    const result = await model.generateContent([prompt, textRaw]);
    const response = await result.response;
    const textRes = response.text();
    return parseGeminiJsonResponse(textRes, textRaw);
  }

  // Se for Imagem ou PDF
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (extension === 'pdf' ? 'application/pdf' : 'image/jpeg');
  
  const fileParts = [
    {
      inlineData: {
        data: base64Data,
        mimeType
      }
    }
  ];

  try {
    const result = await model.generateContent([prompt, ...fileParts]);
    const response = await result.response;
    const textRes = response.text();
    return parseGeminiJsonResponse(textRes, textRes); 
  } catch (error: any) {
    console.error("Erro no Gemini:", error);
    // Em caso de falha da IA ou PDF pesado, fallback para OCR tradicional + RegExp
    if (extension === 'pdf') {
       return extractCnpjsFallbackFromPDF(file);
    }
    throw new Error("Erro na Leitura Dinâmica (IA): " + error.message);
  }
}

function parseGeminiJsonResponse(text: string, fallbackText: string): string[] {
   let cleaned = text.trim();
   // Remove possíveis marcadores markdown do modelo
   cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
   
   try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
         return parsed.map(String).map(s => s.replace(/\D/g, '')).filter(s => s.length === 14);
      }
   } catch(e) {
      console.warn("A IA não retornou um JSON perfeito. Tentando extrair os CNPJs usando RegExp.");
   }
   
   // Se falhou o parse ou não é array, roda o regex na resposta
   const regexFound = extractCnpjs(cleaned);
   if (regexFound.length > 0) return regexFound;
   
   return extractCnpjs(fallbackText);
}

// Fallback convencional para PDFs normais em caso da falha da requisição do Gemini
async function extractCnpjsFallbackFromPDF(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return extractCnpjs(fullText);
}

/**
 * Coordena a extração inteligente de CNPJs
 */
export async function parseFileForCnpjs(file: File): Promise<string[]> {
  try {
    const cnpjs = await processWithGemini(file);
    const unique = Array.from(new Set(cnpjs));
    return unique;
  } catch (error: any) {
    console.error('Erro na extração de CNPJs:', error);
    throw new Error(error.message || 'Não foi possível ler o arquivo. Verifique se o formato está correto.');
  }
}
