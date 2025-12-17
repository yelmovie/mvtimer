
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

async function diagnoseAndFix() {
  const email = 'bongbiyobi@gmail.com';
  console.log(`[Diagnostic] Checking user: ${email}`);

  const supabase = createSupabaseAdminClient();

  // 1. Get User
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('[Error] Fetching users:', userError);
    return;
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('[Error] User not found in Auth');
    return;
  }
  console.log(`[Found] User ID: ${user.id}`);

  // 2. Check Profile Role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    console.log('[Error] Profile fetch failed:', profileError.message);
  } else {
    console.log(`[Current State] Role in DB: '${profile.role}'`);
    
    if (profile.role === 'student') {
        console.log("--> CONFIRMED: Role is incorrectly set to 'student'.");
        console.log("--> ACTION: Updating role to 'teacher'...");
        
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'teacher' })
            .eq('user_id', user.id);
            
        if (updateError) {
            console.error("[Error] Role update failed:", updateError.message);
        } else {
            console.log("[Success] Role updated to 'teacher'.");
        }
    } else if (profile.role === 'teacher') {
        console.log("--> INFO: Role is already 'teacher'. No action needed.");
    } else {
        console.log(`--> WARN: Role is '${profile.role}', expected 'teacher'.`);
    }
  }
}

diagnoseAndFix();
