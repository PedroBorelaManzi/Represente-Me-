import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'pedroborelamanzi@gmail.com',
    password: 'PEbm1103'
  });
  
  if (authError) {
    console.log('Auth Error:', authError);
    return;
  }
  console.log('Logged in as:', authData.user.id);
  
  const { data, error } = await supabase.from('user_settings').upsert({
    user_id: authData.user.id,
    theme: 'dark',
    avatar_url: 'test'
  }, { onConflict: 'user_id' });
  
  console.log('Upsert Data:', data);
  console.log('Upsert Error:', error);
}

test();
