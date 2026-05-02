import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/';
  const headers = {
    apikey: process.env.VITE_SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  const tables = Object.keys(data.paths).filter(p => p !== '/').map(p => p.substring(1));
  console.log('Tabelas existentes no banco:', tables.join(', '));
}
run();