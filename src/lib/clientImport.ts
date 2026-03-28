import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';

// Definindo o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

/**
 * Extrai CNPJs únicos de uma string de texto.
 */
export function extractCnpjs(text: string): string[] {
  const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
  const matches = text.match(cnpjRegex) || [];
  const uniqueCnpjs = Array.from(new Set(matches.map(cnpj => cnpj.replace(/\D/g, ''))));
  return uniqueCnpjs.filter(cnpj => cnpj.length === 14);
}

/**
 * Extrai texto de um arquivo PDF.
 */
async function getPdfText(file: File): Promise<string> {
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
  return fullText;
}

/**
 * Extrai texto de planilhas Excel ou CSV.
 */
async function getExcelText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  let fullText = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    fullText += XLSX.utils.sheet_to_csv(sheet) + '\n';
  });
  return fullText;
}

/**
 * Coordena a extração de CNPJs de diferentes formatos de arquivo.
 */
export async function parseFileForCnpjs(file: File): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text = '';
  
  try {
    if (extension === 'pdf') {
      text = await getPdfText(file);
    } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      text = await getExcelText(file);
    } else {
      text = await file.text();
    }
    return extractCnpjs(text);
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    throw new Error('Não foi possível ler o arquivo. Verifique se o formato está correto.');
  }
}
