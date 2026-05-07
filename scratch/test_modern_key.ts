import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zuzkjsqvfflfechyilqr.supabase.co';
const supabaseAnonKey = 'sb_publishable_UU21kqAZN7TLhY6yi6voEQ_oPfxrLTO';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase Connection with sb_publishable_ key...');
  const { data, error } = await supabase.from('words').select('*').limit(1);
  
  if (error) {
    console.error('Connection Error:', error.message);
    process.exit(1);
  }
  
  console.log('Connection Success!');
  process.exit(0);
}

testConnection();
