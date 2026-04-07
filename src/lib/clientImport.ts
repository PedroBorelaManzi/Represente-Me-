import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { GoogleGenerativeAI } from "@google/generative-ai";

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function extractCnpjs(text: string): string[] {
  const cnpjRegex = /\d{2}[\.\s]*\d{3}[\.\s]*\d{3}[\/\s]*\d{4}[\-\s]*\d{2}/g;
  const matches = text.match(cnpjRegex) || [];
  const uniqueCnpjs = Array.from(new Set(matches.map(cnpj => cnpj.replace(/\D/g, ''))));
  return uniqueCnpjs.filter(cnpj => cnpj.length === 14);
}

async function detectFileType(file: File): Promise<{ type: 'pdf' | 'excel' | 'image' | 'text' | 'unknown', mimeType?: string }> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { type: 'pdf', mimeType: 'application/pdf' };
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return { type: 'excel' };
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return { type: 'excel' };
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { type: 'image', mimeType: 'image/jpeg' };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { type: 'image', mimeType: 'image/png' };
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return { type: 'excel' };
    if (name.endsWith('.txt')) return { type: 'text' };
    return { type: 'unknown' };
  } catch (e) { return { type: 'unknown' }; }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result.split(',')[1] : "");
    reader.onerror = reject;
  });
}

async function processWithGemini(file: File): Promise<string[]> {
  if (!apiKey || !genAI) throw new Error("VITE_GEMINI_API_KEY não configurada.");
  
    const prompt = `ATENÇÃO: Extraia os números de CNPJ (14 dígitos) apenas dos CLIENTES/COMPRADORES contidos neste documento. Ignore o CNPJ da Fábrica/Emissor.
  Retorne APENAS um Array JSON: ["12345678000199", "98765432000111"]`;

  const detected = await detectFileType(file);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

  try {
    let result;
    if (detected.type === 'image') {
      const base64 = await fileToBase64(file);
      result = await model.generateContent([prompt, { inlineData: { data: base64, mimeType: detected.mimeType } }]);
    } else {
      let text = "";
      if (detected.type === 'excel') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        workbook.SheetNames.forEach(name => { text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + '\n'; });
      } else if (detected.type === 'pdf') {
        const pages = await extractTextFromPDF(file);
        text = pages.join('\n');
      } else {
        text = await file.text();
      }
      result = await model.generateContent(prompt + "\n\nConteúdo:\n" + text);
    }

    const resText = result.response.text();
    const cleanJson = resText.replace(/```json/g, "").replace(/```/g, "").trim();
    const cnpjs = JSON.parse(cleanJson);
    return Array.isArray(cnpjs) ? cnpjs.map(String).map(s => s.replace(/\D/g, '')).filter(s => s.length === 14) : [];
  } catch (error: any) {
    console.error("Erro no Gemini:", error);
    if (detected.type === 'pdf') return extractCnpjsFallbackFromPDF(file);
    throw new Error("Erro na IA de Importação: " + error.message);
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
  const results = extractCnpjs(texts.join('\\n'));
  if (results.length === 0) throw new Error("Nenhum CNPJ detectado.");
  return results;
}

export async function parseFileForCnpjs(file: File): Promise<string[]> {
  try {
    const cnpjs = await processWithGemini(file);
    return Array.from(new Set(cnpjs));
  } catch (error: any) {
    console.error('Erro no parse do CNPJ:', error);
    throw new Error(error.message || 'Falha na leitura do arquivo.');
  }
}

