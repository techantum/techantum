import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Admin already configured' }, { status: 403 });
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 500 });
  }

  const { error: adminError } = await supabase.from('admin_users').insert({
    user_id: authData.user.id,
    email,
    role: 'SUPER_ADMIN',
  });

  if (adminError) {
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}
