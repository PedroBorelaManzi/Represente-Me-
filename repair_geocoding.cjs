const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function geocode(address, city, state) {
  // Try address first, then city center
  const queries = [
    `${address}, ${city}, ${state}, Brasil`,
    `${city}, ${state}, Brasil`
  ];

  for (const q of queries) {
    try {
      console.log(`Buscando: ${q}`);
      // Using generic fetch if available or node-fetch
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'RepresenteMeCRMRepair/1.0' }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          source: q
        };
      }
    } catch (e) {
      console.error(`Erro ao geocodificar ${q}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1200)); // Be conservative with rate limit
  }
  return null;
}

async function repair() {
  console.log("Iniciando reparo de geolocalização TOTAL...");
  
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, address, city, state, lat, lng");
    
  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return;
  }
  
  console.log(`Total de clientes para revisar: ${clients.length}`);
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const client of clients) {
    console.log(`\nProcessando [${client.id}]: ${client.name} (${client.city})`);
    
    // Always geocode to ensure we are not in a trap
    const coords = await geocode(client.address, client.city, client.state);
    
    if (coords) {
      const isDifferent = Math.abs(client.lat - coords.lat) > 0.0001 || Math.abs(client.lng - coords.lng) > 0.0001;
      
      if (isDifferent || client.lat === null) {
        const { error: updateError } = await supabase
          .from("clients")
          .update({ lat: coords.lat, lng: coords.lng })
          .eq("id", client.id);
          
        if (updateError) {
          console.error(`Erro ao atualizar ${client.name}:`, updateError);
          failCount++;
        } else {
          console.log(`✅ Atualizado: ${coords.lat}, ${coords.lng} (anterior: ${client.lat}, ${client.lng})`);
          successCount++;
        }
      } else {
        console.log("ℹ️ Coordenadas já estão corretas.");
        skippedCount++;
      }
    } else {
      console.log("⚠️ Falha total ao geocodificar.");
      failCount++;
    }
  }
  
  console.log("\n--- Resumo Final ---");
  console.log(`Total: ${clients.length}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Falhas: ${failCount}`);
  console.log(`Ignorados: ${skippedCount}`);
}

repair();
