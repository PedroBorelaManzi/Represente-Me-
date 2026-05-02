import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('clients').select('id').limit(1);
  console.log('Test clients connection:', error ? error.message : 'OK');

  // Let's use the RPC we have to list files and see the structure
  const { data: filesData, error: err3 } = await supabase.rpc('list_user_files', { u_id: 'dummy' });
  console.log('rpc list_user_files error:', err3 ? err3.message : 'No error');
}
run();