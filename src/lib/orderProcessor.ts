import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

export interface OrderExtractionResult {
  client: string;
  cnpj: string;
  category: string;
  value: number;
  address?: string;
  status: "ready" | "error";
  error?: string;
  method?: "local" | "ai";
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function detectFileType(file) {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { type: "pdf", mimeType: "application/pdf" };
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return { type: "excel", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return { type: "excel", mimeType: "application/vnd.ms-excel" };
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { type: "image", mimeType: "image/jpeg" };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { type: "image", mimeType: "image/png" };
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".xlsx")) return { type: "excel" };
    if (name.endsWith(".txt")) return { type: "text", mimeType: "text/plain" };
    return { type: "unknown", mimeType: file.type };
  } catch (e) { return { type: "unknown", mimeType: file.type }; }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
  });
}

function extractCNPJLocally(text: string): string {
  const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
  const matches = text.match(cnpjRegex);
  if (matches && matches.length > 0) {
    return matches[0].replace(/\D/g, "");
  }
  return "";
}

function extractValueLocally(text: string): number {
  const valueRegex = /(?:total|valor|vlr|pago|lqd|lquido|receber).*?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i;
  const match = text.match(valueRegex);
  if (match && match[1]) {
    return parseFloat(match[1].replace(/\./g, "").replace(",", "."));
  }
  return 0;
}

export async function processOrderFile(file, knownClients = [], categories = []) {
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY no configurada.");
  
  try {
    const detected = await detectFileType(file);
    let extractedText = "";

    // 1. EXTRAO DE TEXTO (PDF / Excel / TXT)
    if (detected.type === "pdf") {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
    } else if (detected.type === "excel") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      workbook.SheetNames.forEach(name => {
        extractedText += XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + "\n";
      });
    } else if (detected.type === "text") {
      extractedText = await file.text();
    }

    // 2. TENTATIVA DE TRIAGEM LOCAL (CNPJ e Valor)
    const localCnpj = extractCNPJLocally(extractedText);
    const localValue = extractValueLocally(extractedText);

    // Se o arquivo for imagem ou no tiver CNPJ claro, pular triagem local e ir direto pra IA
    if (detected.type !== "image" && localCnpj && localValue > 0) {
      console.log("Local Triage Success:", file.name, "CNPJ:", localCnpj, "Value:", localValue);
      return {
        client: "Detectado via CNPJ",
        cnpj: localCnpj,
        category: "", // Deixamos para o usurio ou IA secundria
        value: localValue,
        status: "ready",
        method: "local"
      };
    }

    // 3. FALLBACK GEMINI IA (GRTIS)
    if (!genAI) throw new Error("Google Generative AI no inicializado.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = \Analise este pedido e extraia: client, cnpj (apenas numeros), category, value (numero), address.
    Retorne APENAS um JSON: {"client": "...", "cnpj": "...", "category": "...", "value": 0.00, "address": "..."}
    Categorias Conhecidas: \
    Clientes Conhecidos: \
    Contedo: \\;

    let result;
    if (detected.type === "image") {
      const base64 = await fileToBase64(file);
      result = await model.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: detected.mimeType } }
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/`json/g, "").replace(/`/g, "").trim();
    const data = JSON.parse(cleanJson);

    return {
      client: data.client || "",
      cnpj: (data.cnpj || "").replace(/\D/g, ""),
      category: data.category || "",
      value: typeof data.value === "number" ? data.value : parseFloat(String(data.value).replace(/[^\d.]/g, "")) || 0,
      address: data.address || "",
      status: "ready",
      method: "ai"
    };

  } catch (err) {
    console.error("Gemini Extraction error:", err);
    return { 
      client: "", 
      cnpj: "", 
      category: "", 
      value: 0, 
      status: "error", 
      error: err instanceof Error ? err.message : "Falha no processamento Gemini." 
    };
  }
}
