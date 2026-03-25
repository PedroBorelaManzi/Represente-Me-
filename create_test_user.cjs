const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wdtftftwdqtihupbtlxk.supabase.co';
const supabaseAnonKey = 'sb_publishable_Yy11Yl5noqtaHOmUi1kesw_hAS5lmVW';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function create() {
  const { data, error } = await supabase.auth.signUp({
    email: 'teste@teste.com',
    password: 'senha123'
  });

  if (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } else {
    console.log('User created (Pending Confirmation):', data.user?.id);
  }
}

create();
