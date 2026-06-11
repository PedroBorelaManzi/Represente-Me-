import { supabase } from './src/lib/supabase';
import { syncGoogleEvents } from './src/lib/googleSync';

async function test() {
  const { data, error } = await supabase.from('user_google_tokens').select('user_id').limit(1);
  if (error || !data || data.length === 0) {
    console.error('No users found', error);
    return;
  }
  const userId = data[0].user_id;
  console.log('Testing sync for user', userId);
  try {
    const res = await syncGoogleEvents(userId);
    console.log('Sync result:', res);
  } catch (err) {
    console.error('Caught error globally:', err);
  }
}

test();
