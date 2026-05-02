import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.from('client_files').select('category, value').limit(1);
  if (error) {
    console.error('Error on client_files:', error.message);
  } else {
    console.log('client_files has category and value');
  }

  const { error: err2 } = await supabase.from('orders').select('category').limit(1);
  if (err2) {
    console.error('Error on orders:', err2.message);
  } else {
    console.log('orders has category');
  }
}
run();