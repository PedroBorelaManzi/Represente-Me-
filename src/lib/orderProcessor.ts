import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";

pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

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

const SYSTEM_INSTRUCTION = `Você é um especialista em OCR de documentos fiscais brasileiros.
Sua tarefa é extrair quatro informações fundamentais em formato JSON:
1. CLIENTE DESTINATÁRIO: Nome da empresa que está comprando. Ignore o Emissor.
2. VALOR TOTAL: O valor final líquido do documento.
3. CATEGORIA (FORNECEDOR): O fabricante/emissor do pedido. 
   - REGRA DE OURO: Você deve selecionar EXCLUSIVAMENTE uma das "CATEGORIAS CONHECIDAS" fornecidas.
   - Use o nome EXATO que estiver na lista. Se o emissor for "Cozimax Móveis Mirassol Ltda" e a lista tiver "Cozimax", use "Cozimax".
   - NUNCA invente uma categoria nova. Se não houver correspondência clara, retorne uma string vazia.
4. ENDEREÇO: O endereço completo de entrega do cliente.

Retorne APENAS um objeto JSON válido seguindo este esquema:
{
  "client": string,
  "cnpj": string,
  "category": string,
  "value": number,
  "address": string
}`;

async function detectFileType(file: File) {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x25 && bytes[1] === 0x50) return { type: "pdf", mimeType: "application/pdf" };
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return { type: "excel", mimeType: "application/vnd.openxmlformats" };
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) return { type: "image", mimeType: file.type };
  return { type: "unknown", mimeType: file.type };
}

function extractCNPJLocally(text: string): string {
  const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}/g;
  const matches = text.match(cnpjRegex);
  if (matches && matches.length > 0) {
    const clientKeywords = ["destinatário", "cliente", "comprador", "entregar"];
    for (const match of matches) {
      const index = text.indexOf(match);
      const context = text.toLowerCase().substring(Math.max(0, index - 150), index);
      if (clientKeywords.some(kw => context.includes(kw))) return match.replace(/\D/g, "");
    }
    return matches[0].replace(/\D/g, "");
  }
  return "";
}

function extractValueLocally(text: string): number {
  const valueRegex = /(?:valor total da nota|total geral|valor líquido|vlr total|total do pedido).*?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i;
  const match = text.match(valueRegex);
  return match?.[1] ? parseFloat(match[1].replace(/\./g, "").replace(",", ".")) : 0;
}

export async function processOrderFile(file: File, knownClients = [], categories = []) {
  if (!apiKey || !genAI) throw new Error("Chave Gemini não configurada.");
  
  try {
    const detected = await detectFileType(file);
    let extractedText = "";

    if (detected.type === "pdf") {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
    } else if (detected.type === "excel") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      extractedText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    }

    const localCnpj = extractCNPJLocally(extractedText);
    const localValue = extractValueLocally(extractedText);

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        systemInstruction: SYSTEM_INSTRUCTION
    }, { apiVersion: "v1beta" });

    const userPrompt = `Analise este documento:
    HINTS LOCAIS (Extraídos via Regex):
    - CNPJ detectado: ${localCnpj || "Não detectado"}
    - Valor provável: ${localValue || "Não detectado"}
    
    CATEGORIAS CONHECIDAS (USE APENAS UMA DESTAS): ${categories.join(", ")}
    
    CONTEÚDO DO DOCUMENTO:
    ${extractedText.substring(0, 10000)}
    `;

    let result;
    if (detected.type === "image") {
       const reader = new FileReader();
       const base64Promise = new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
       });
       const base64 = await base64Promise;
       result = await model.generateContent({
         contents: [{ role: "user", parts: [
            { text: userPrompt },
            { inlineData: { data: base64 as string, mimeType: detected.mimeType } }
         ]}],
         generationConfig: { responseMimeType: "application/json" }
       });
    } else {
       result = await model.generateContent({
         contents: [{ role: "user", parts: [{ text: userPrompt }] }],
         generationConfig: { responseMimeType: "application/json" }
       });
    }

    let textResult = result.response.text();
    if (textResult.includes("```")) {
        textResult = textResult.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
    }
    const data = JSON.parse(textResult);

    // Validação final de categoria (Reforço à instrução)
    let finalCategory = data.category || "";
    if (finalCategory && categories.length > 0) {
        const found = categories.find(c => c.toLowerCase() === finalCategory.toLowerCase());
        if (!found) {
            // Tenta busca parcial se não houver match exato
            const partial = categories.find(c => finalCategory.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(finalCategory.toLowerCase()));
            finalCategory = partial || ""; // Se não encontrar nada parecido, zera.
        } else {
            finalCategory = found;
        }
    }

    return {
      client: data.client || "Desconhecido",
      cnpj: (data.cnpj || localCnpj || "").replace(/\D/g, ""),
      category: finalCategory,
      value: data.value || localValue || 0,
      address: data.address || "",
      status: "ready",
      method: "ai"
    };

  } catch (err) {
    console.error("AI Reader Error Details:", err);
    return { 
        client: "", 
        cnpj: "", 
        category: "", 
        value: 0, 
        status: "error", 
        error: "Falha na leitura IA acelerada: " + (err instanceof Error ? err.message : "Erro desconhecido") 
    };
  }
}



