import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import OpenAI from "openai";

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

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

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
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY no configurada.");
  
  const prompt = `Analise detalhadamente este arquivo de pedido/faturamento e extraia as informaes no formato JSON.

  REGRAS DE EXTRAO:
  1. "client": Nome da Empresa/Cliente/Razo Social que est COMPRANDO.
  2. "cnpj": CNPJ do cliente comprador (apenas nmeros). Procure por "CNPJ Destinatrio" ou similar.
  3. "category": Identifique a qual CATEGORIA ou REPRESENTADA o pedido se refere. 
     - Analise os produtos vendidos. Se forem roupas de marca X, a categoria  X. 
     - Se o cabealho indicar "Pedido de Empresa Y", a categoria pode ser Y.
     - Categorias Conhecidas: ${categories.join(", ")}
     - Se NO tiver certeza, tente sugerir a mais provvel ou deixe null.
  4. "value": Valor TOTAL do pedido (nmero decimal com . como separador).
  5. "address": Endereo completo do cliente (Rua, Nmero, Bairro, Cidade, UF). Muito importante para geolocalizao.
  
  Lista de Clientes que j temos no sistema: ${knownClients.join(", ")}
  
  Retorne APENAS o JSON no formato abaixo, sem explicaes:
  {"client": "NOME", "cnpj": "12345678901234", "category": "CATEGORIA", "value": 0.00, "address": "ENDERECO COMPLETO"}
  
  Se um campo no for encontrado, use null.`;

  try {
    const detected = await detectFileType(file);
    console.log("GPT Processing file:", file.name, "Type:", detected.type);

    let content: any[] = [{ type: "text", text: prompt }];

    if (detected.type === "image") {
      const base64 = await fileToBase64(file);
      content.push({
        type: "image_url",
        image_url: { url: `data:${detected.mimeType};base64,${base64}` }
      });
    } else if (detected.type === "excel") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      let fullText = "";
      workbook.SheetNames.forEach(name => {
        fullText += "--- Planilha: " + name + " ---\n" + XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + "\n";
      });
      content.push({ type: "text", text: "Contedo do Excel:\n" + fullText });
    } else {
      // PDF or Text - Extract text content
      let text = "";
      if (detected.type === "pdf") {
         const buffer = await file.arrayBuffer();
         const pdf = await pdfjs.getDocument({ data: buffer }).promise;
         for (let i = 1; i <= pdf.numPages; i++) {
           const page = await pdf.getPage(i);
           const content = await page.getTextContent();
           text += content.items.map((item: any) => item.str).join(" ") + "\n";
         }
      } else {
         text = await file.text();
      }
      content.push({ type: "text", text: "Contedo extrado do arquivo:\n" + text });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0].message.content || "{}";
    return parseAIResponse(resultText);

  } catch (err) {
    console.error("GPT Extraction error:", err);
    return { 
      client: "", 
      cnpj: "", 
      category: "", 
      value: 0, 
      status: "error", 
      error: err instanceof Error ? err.message : "Falha no processamento GPT." 
    };
  }
}

function parseAIResponse(text) {
  try {
    const data = JSON.parse(text);
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
