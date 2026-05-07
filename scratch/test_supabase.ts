import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zuzkjsqvfflfechyilqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1emtqc3F2ZmZsZmVjaHlpbHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDA2MjUsImV4cCI6MjA5MzQ3NjYyNX0.333iyVhO5FdEsoWmDr7HCpYnoMygndpjckZwRVwg7O8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignUp() {
  console.log('Testing Supabase SignUp...');
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) {
    console.error('SignUp Error:', error.message);
    process.exit(1);
  }
  
  console.log('SignUp Success:', data.user?.email);
  process.exit(0);
}

testSignUp();
