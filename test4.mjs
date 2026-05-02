import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Try to fetch a list of tables from information_schema
  const response = await fetch(${process.env.VITE_SUPABASE_URL}/rest/v1/, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: Bearer 
    }
  });
  const data = await response.json();
  console.log('Tables:', Object.keys(data.paths).filter(p => p !== '/'));
}
run();