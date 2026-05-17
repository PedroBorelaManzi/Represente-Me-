import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  
  const { data, error } = await supabase.from('user_settings').upsert({
    user_id: fakeUserId,
    alerta_days: 30,
    critico_days: 45,
    perda_days: 60,
    inativo_days: 90,
    theme: 'dark',
    has_completed_onboarding: true,
    categories: ['GERAL'],
    revenue_ceiling: 1000000,
    subscription_status: 'active',
    plan_id: 'exclusivo'
  }, { onConflict: 'user_id' });
  
  console.log('Upsert Error:', error);
}

test();
