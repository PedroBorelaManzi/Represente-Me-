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
 * Identifica o tipo real do arquivo lendo a assinatura em ArrayBuffer
 */
async function detectFileType(file: File): Promise<{ type: 'pdf' | 'excel' | 'image' | 'text' | 'unknown', mimeType?: string }> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // PDF: %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { type: 'pdf', mimeType: 'application/pdf' };
    }
    
    // Excel/Zip/Docx: PK\x03\x04
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { type: 'excel' };
    }
    // Excel antigo (XLS): OLE2
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      return { type: 'excel' };
    }
    
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { type: 'image', mimeType: 'image/jpeg' };
    }
    
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { type: 'image', mimeType: 'image/png' };
    }
    
    // WEBP: RIFF ... WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return { type: 'image', mimeType: 'image/webp' };
    }
    
    // Caso de extensões csv ou txt
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return { type: 'excel' };
    if (name.endsWith('.txt')) return { type: 'text' };
    
    return { type: 'unknown' };
  } catch (e) {
    return { type: 'unknown' };
  }
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

  const detected = await detectFileType(file);
  console.log("Detectado:", detected, file.name);
  
  // Excel/CSV
  if (detected.type === 'excel') {
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
  
  // Texto plano
  if (detected.type === 'text' || (detected.type === 'unknown' && file.size < 1024 * 500)) {
    // Se não sabe o que é e é pequeno, tenta ler como texto
    try {
       const textRaw = await file.text();
       const result = await model.generateContent([prompt, textRaw]);
       const response = await result.response;
       const textRes = response.text();
       return parseGeminiJsonResponse(textRes, textRaw);
    } catch(e) { /* Ignora e passa pro fallback binário */ }
  }

  // Se for Imagem ou PDF, envia pelo mimeType confiável detectado através de Magic Bytes
  // Em vez de usar file.type que pode vir em branco no Windows
  let mimeToUse = detected.mimeType;
  if (!mimeToUse) {
     // Se cair aqui e não tiver mimeType (e.g. tipo unknown caindo no fallback), forçamos uma tentativa de PDF (cenário Adobe sem extensão)
     mimeToUse = 'application/pdf';
  }

  const base64Data = await fileToBase64(file);
  const fileParts = [
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeToUse
      }
    }
  ];

  try {
    const result = await model.generateContent([prompt, ...fileParts]);
    const response = await result.response;
    const textRes = response.text();
    return parseGeminiJsonResponse(textRes, textRes); 
  } catch (error: any) {
    console.error("Erro no Gemini (Mime:", mimeToUse, "):", error);
    // Em caso de falha da IA ou PDF pesado, fallback para OCR tradicional (pdfjs/regex)
    if (mimeToUse === 'application/pdf') {
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
   
   // Se falhou o parse ou não é array, roda o regex na resposta (caso o modelo tenha simplesmente listado texto)
   const regexFound = extractCnpjs(cleaned);
   if (regexFound.length > 0) return regexFound;
   
   // Se não encontrou nada na resposta, tenta fazer o parse direto do texto do fallback
   return extractCnpjs(fallbackText);
}

// Fallback convencional para PDFs normais em caso da falha da requisição do Gemini
async function extractCnpjsFallbackFromPDF(file: File): Promise<string[]> {
  try {
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
  } catch (e) {
    console.error("Falha ao usar PDFJS de fallback", e);
    return [];
  }
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
    throw new Error(error.message || 'Não foi possível ler o arquivo. Tem certeza que o arquivo não está corrompido?');
  }
}
