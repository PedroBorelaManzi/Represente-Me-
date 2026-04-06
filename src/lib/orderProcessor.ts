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
}

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

export async function processOrderFile(file, knownClients = [], categories = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  
  const prompt = `Analise detalhadamente este arquivo de pedido/faturamento e extraia as informações no formato JSON.

  REGRAS DE EXTRAÇÃO:
  1. "client": Nome da Empresa/Cliente/Razão Social que está COMPRANDO.
  2. "cnpj": CNPJ do cliente comprador (apenas números). Procure por "CNPJ Destinatário" ou similar.
  3. "category": Identifique a qual CATEGORIA ou REPRESENTADA o pedido se refere. 
     - Analise os produtos vendidos. Se forem roupas de marca X, a categoria é X. 
     - Se o cabeçalho indicar "Pedido de Empresa Y", a categoria pode ser Y.
     - Categorias Conhecidas: ${categories.join(", ")}
     - Se NÃO tiver certeza, tente sugerir a mais provável ou deixe null.
  4. "value": Valor TOTAL do pedido (número decimal com . como separador).
  5. "address": Endereço completo do cliente (Rua, Número, Bairro, Cidade, UF). Muito importante para geolocalização.
  
  Lista de Clientes que já temos no sistema: ${knownClients.join(", ")}
  
  Retorne APENAS o JSON no formato abaixo, sem explicações:
  {"client": "NOME", "cnpj": "12345678901234", "category": "CATEGORIA", "value": 0.00, "address": "ENDERECO COMPLETO"}
  
  Se um campo não for encontrado, use null.`;

  try {
    const detected = await detectFileType(file);
    console.log("Processing file:", file.name, "Detected type:", detected.type);

    if (detected.type === "excel") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      let fullText = "";
      workbook.SheetNames.forEach(name => {
        fullText += "--- Planilha: " + name + " ---\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + "\n";
      });
      const result = await model.generateContent([prompt, fullText]);
      return parseAIResponse(result.response.text());
    }

    if (detected.type === "text" || (detected.type === "unknown" && file.size < 50000)) {
       try {
           const text = await file.text();
           if (text.trim().length > 10) {
               const result = await model.generateContent([prompt, text]);
               return parseAIResponse(result.response.text());
           }
       } catch(e) {
           console.warn("Text read fallback failed:", e);
       }
    }

    const base64 = await fileToBase64(file);
    const result = await model.generateContent([
      { 
        inlineData: { 
          mimeType: detected.mimeType || file.type || "application/pdf", 
          data: base64 
        } 
      }, 
      prompt
    ]);
    
    return parseAIResponse(result.response.text());
  } catch (err) {
    console.error("Extraction error:", err);
    return { 
      client: "", 
      cnpj: "", 
      category: "", 
      value: 0, 
      status: "error", 
      error: err instanceof Error ? err.message : "Falha no processamento IA." 
    };
  }
}

function parseAIResponse(text) {
  try {
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("No JSON found");
    const data = JSON.parse(jsonMatch[0]);
    return {
      client: data.client || "",
      cnpj: (data.cnpj || "").replace(/\D/g, ""),
      category: data.category || "",
      value: typeof data.value === "number" ? data.value : parseFloat(String(data.value).replace(/[^\d.]/g, "")) || 0,
      address: data.address || "",
      status: "ready"
    };
  } catch (e) {
    return { client: "", cnpj: "", category: "", value: 0, status: "error", error: "Falha ao ler resposta da IA." };
  }
}
