import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export interface ImportResult {
  success: boolean;
  importedCount: number;
  totalFound: number;
  error?: string;
}

export async function parseFileForCnpjs(file: File): Promise<string[]> {
  try {
    const text = await readFileAsText(file);
    
    // RegEx rápida para encontrar padrões de CNPJ
    const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    const matches = text.match(cnpjRegex) || [];
    
    // Limpar e remover duplicados
    const uniqueCnpjs = [...new Set(matches.map(m => m.replace(/\D/g, '')))];
    
    if (uniqueCnpjs.length === 0) return [];

    // Validar com a IA para garantir que são CNPJs de CLIENTES (e não da fábrica)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || !genAI) throw new Error("VITE_GEMINI_API_KEY não configurada.");

    const prompt = `ATENÇÃO: Extraia os números de CNPJ (14 dígitos) apenas dos CLIENTES/COMPRADORES contidos neste documento. Ignore o CNPJ da Fábrica/Emissor.
    
    Lista de prováveis CNPJs encontrados: ${uniqueCnpjs.join(', ')}
    
    Responda apenas com os CNPJs válidos de clientes em um array JSON:
    ["00000000000000", "11111111111111"]`;

    let result;
    try {
      result = await model.generateContent(prompt + "\n\nConteúdo:\n" + text.substring(0, 30000));
      const response = await result.response;
      const jsonStr = response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn("IA falhou na validação de CNPJ, usando Regex puro:", err);
      return uniqueCnpjs;
    }

  } catch (error: any) {
    console.error('Erro no parser de CNPJ:', error);
    return [];
  }
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
