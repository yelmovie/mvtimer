
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

async function fixUser() {
  const email = 'bongbiyobi@gmail.com';
  console.log(`Fixing user: ${email}`);

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

  // 2. Insert into Profiles Table
  const { error: insertError } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      email: email,
      role: 'teacher',
      name: 'Teacher Test'
    }, { onConflict: 'user_id' });

  if (insertError) {
    console.error('Error creating profile:', insertError);
  } else {
    console.log('Profile successfully created/updated as teacher.');
  }
}

fixUser();
