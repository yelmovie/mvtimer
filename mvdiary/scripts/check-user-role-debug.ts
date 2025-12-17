
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

async function checkUser() {
  const email = 'bongbiyobi@gmail.com';
  console.log(`Checking user: ${email}`);

  const supabase = createSupabaseAdminClient();

  // 1. Get User ID from Auth
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.log('User not found in Auth');
    return;
  }

  console.log(`User found in Auth. ID: ${user.id}`);

  // 2. Check Profiles Table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    console.log('Error fetching profile or profile not found:', profileError.message);
  } else {
    console.log('Profile found:', profile);
  }
}

checkUser();
