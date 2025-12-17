
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const email = 'bongbiyobi@gmail.com';
  console.log(`[Fix] Target: ${email}`);

  // 1. Read .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read .env.local', e);
    return;
  }

  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });

  const url = env['NEXT_PUBLIC_SUPABASE_URL'];
  let key = env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    console.error('Missing Supabase credentials in .env.local');
    return;
  }
  
  // Clean key: remove 'image.png' if present (artifact of copy-paste?)
  if (key.endsWith('image.png')) {
    console.log('Detected dirty key (image.png), cleaning...');
    key = key.replace('image.png', '').trim();
  }
  
  console.log(`Using URL: ${url}`);
  console.log(`Using Key: ${key.substring(0, 10)}... (Length: ${key.length})`);

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 2. Find User
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('List Users Error:', userError);
    return;
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found');
    return;
  }
  console.log(`User ID: ${user.id}`);

  // 3. Update Profile
  console.log('Updating profile role to "teacher"...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'teacher' })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Update Failed:', updateError);
  } else {
    console.log('Success! Role updated to teacher.');
  }
  
  // Verify
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  console.log('Verification Role:', profile?.role);
}

main();
