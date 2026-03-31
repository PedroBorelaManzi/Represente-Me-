const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const API_KEY = "AIzaSyAMqmdeFJqZUclIGdVA1-PZu4OOAxvDucg";
const genAI = new GoogleGenerativeAI(API_KEY);

const ARTIFACT_DIR = "C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\9d16d0f8-55f0-46f5-a2e5-78be7aed06d7";
const CLIENTS_DATA_PATH = path.join(ARTIFACT_DIR, "clients_data.json");
const RESULT_PATH = path.join(ARTIFACT_DIR, "geocoding_audit_results.json");

async function getCoords(client) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Atue como um especialista em geolocalizacao no Brasil. Encontre coordenadas para ${client.name} (CNPJ: ${client.cnpj}). Endereco: ${client.address}, ${client.city}, ${client.state}. Retorne APENAS {"lat": -00.0, "lng": -00.0}.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    if (error.message && error.message.includes("429")) return "RETRY";
    return null;
  }
}

async function run() {
  const clients = JSON.parse(fs.readFileSync(CLIENTS_DATA_PATH, "utf-8"));
  let results = fs.existsSync(RESULT_PATH) ? JSON.parse(fs.readFileSync(RESULT_PATH, "utf-8")) : [];
  console.log("Starting geocoding... Resuming from " + results.length);
  for (let i = results.length; i < clients.length; i++) {
    const client = clients[i];
    let result = await getCoords(client);
    if (result === "RETRY") {
       console.log("Rate limit hit, waiting 60s...");
       await new Promise(r => setTimeout(r, 60000));
       result = await getCoords(client);
    }
    if (result && result !== "RETRY") {
      results.push({ id: client.id, name: client.name, old_lat: client.lat, old_lng: client.lng, new_lat: result.lat, new_lng: result.lng });
      fs.writeFileSync(RESULT_PATH, JSON.stringify(results, null, 2));
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Done!");
}
run();
