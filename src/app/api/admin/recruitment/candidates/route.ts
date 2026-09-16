import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveUploadedFile } from '@/lib/storage/local';
import { extractResumeText } from '@/lib/recruitment/resume';
import { assessCandidate } from '@/lib/recruitment/service';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const jobRoleId = String(formData.get('job_role_id') || '');
    const source = String(formData.get('source') || '').trim() || null;
    const runAi = formData.get('run_ai') === 'true';
    const file = formData.get('resume') as File | null;

    if (!jobRoleId) return NextResponse.json({ error: 'job_role_id is required' }, { status: 400 });
    if (!file) return NextResponse.json({ error: 'Resume file is required' }, { status: 400 });

    const { text, warning } = await extractResumeText(file);
    if (!text.trim() && warning) {
      return NextResponse.json({ error: warning }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
    const { url } = await saveUploadedFile('recruitment-resumes', `${Date.now()}-${safeName}`, file);

    const supabase = createAdminClient();
    const { data: candidate, error } = await supabase
      .from('recruitment_candidates')
      .insert({
        job_role_id: jobRoleId,
        source,
        resume_url: url,
        resume_file_name: file.name,
        resume_text: text,
        status: 'NEW',
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select('*')
      .single();

    if (error || !candidate) return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 });

    if (runAi && text.trim()) {
      const result = await assessCandidate(candidate.id, auth.user.id);
      return NextResponse.json({ candidate: result.candidate, assessment: result.assessment, warning });
    }

    return NextResponse.json({ candidate, warning });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
