import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: files, error: err1 } = await supabase.from('client_files').select('*').limit(1);
  console.log('client_files columns:', files && files.length > 0 ? Object.keys(files[0]) : 'no data or error', err1);
  
  const { data: orders, error: err2 } = await supabase.from('orders').select('*').limit(1);
  console.log('orders columns:', orders && orders.length > 0 ? Object.keys(orders[0]) : 'no data or error', err2);
}
check();