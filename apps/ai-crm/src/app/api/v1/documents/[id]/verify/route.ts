import { getSession, hasMinRole } from '@/lib/auth';
import { verifyUploadedDocument } from '@/lib/document-verify';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'document_reviewer')) return forbidden();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const doc = await verifyUploadedDocument(
      session.workspaceId,
      id,
      body.extracted || {},
      body.clarityScore,
    );
    return ok({ document: doc });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Verify failed', 500);
  }
}
