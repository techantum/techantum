import { NextResponse } from 'next/server';
import { FEATURE_YOUTUBE, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { financeErrorResponse } from '@/lib/finance/http';
import { isSuperAdmin } from '@/lib/admin/roles';
import { canManageHookoohKnowledge, canManageHookoohSettings, canUseHookooh } from '@/lib/hookooh/access';
import { HOOKOOH_SUGGESTIONS, answerHookooh } from '@/lib/hookooh/engine';
import {
  addHookoohMessage,
  createHookoohConversation,
  deleteHookoohConversation,
  deleteLastAssistantMessage,
  getHookoohConversation,
  hookoohEnabled,
  hookoohUsage,
  listHookoohConversations,
  listHookoohHistory,
  renameHookoohConversation,
  saveHookoohFeedback,
  setHookoohEnabled,
} from '@/lib/hookooh/store';

async function actor() {
  const person = await getPlatformActor();
  if (!person) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canUseHookooh(person.role)) return { error: NextResponse.json({ error: 'Hookooh is not available for this role.' }, { status: 403 }) };
  const access = await resolveAccess(person.account, person.role);
  if (!isSuperAdmin(person.role) && !access.has(FEATURE_YOUTUBE)) {
    return { error: NextResponse.json({ error: 'YouTube Research is required for Hookooh.' }, { status: 402 }) };
  }
  const enabled = await hookoohEnabled();
  return {
    userId: person.userId,
    accountId: person.account?.id || null,
    role: person.role,
    enabled,
    canManageKnowledge: canManageHookoohKnowledge(person.role),
    canManageSettings: canManageHookoohSettings(person.role),
  };
}

async function requireUser() {
  const auth = await actor();
  if ('error' in auth) return auth;
  if (!auth.enabled && !auth.canManageSettings) {
    return { error: NextResponse.json({ error: 'Hookooh is currently disabled.' }, { status: 403 }) };
  }
  return auth;
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const auth = await actor();
    if ('error' in auth) return auth.error;
    if (!path[0] || path[0] === 'session') {
      return NextResponse.json({
        allowed: true,
        enabled: auth.enabled,
        canManageKnowledge: auth.canManageKnowledge,
        canManageSettings: auth.canManageSettings,
        suggestions: HOOKOOH_SUGGESTIONS,
        welcome:
          "Hey! I'm Hookooh, your YouTube growth assistant. Whether you're planning a new video, improving your thumbnails, understanding your analytics, or growing your channel, I'm here to help!",
      });
    }
    if (path[0] === 'settings') {
      if (!auth.canManageSettings) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json({ enabled: auth.enabled, usage: await hookoohUsage() });
    }
    if (path[0] === 'conversations' && path[1]) {
      const gated = await requireUser();
      if ('error' in gated) return gated.error;
      return NextResponse.json(await getHookoohConversation(path[1], gated.userId, gated.accountId));
    }
    if (path[0] === 'conversations') {
      const gated = await requireUser();
      if ('error' in gated) return gated.error;
      return NextResponse.json({ rows: await listHookoohConversations(gated.userId, gated.accountId) });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const body = await request.json().catch(() => ({}));
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    if (path[0] === 'test') {
      if (!auth.canManageKnowledge) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const reply = await answerHookooh({ question: String(body.content || body.question || ''), history: [] });
      return NextResponse.json(reply);
    }
    if (path[0] === 'conversations' && !path[1]) {
      return NextResponse.json(await createHookoohConversation(auth.userId, auth.accountId));
    }
    if (path[0] === 'conversations' && path[1] && path[2] === 'messages') {
      const conversation = await getHookoohConversation(path[1], auth.userId, auth.accountId);
      const question = String(body.content || '').trim();
      await addHookoohMessage(path[1], 'user', question);
      const history = conversation.messages.map((item) => ({ role: item.role as 'user' | 'assistant', content: item.content }));
      const reply = await answerHookooh({ question, history });
      const saved = await addHookoohMessage(path[1], 'assistant', reply.text, reply.sources);
      return NextResponse.json({ message: saved, sources: reply.sources });
    }
    if (path[0] === 'conversations' && path[1] && path[2] === 'regenerate') {
      await deleteLastAssistantMessage(path[1], auth.userId, auth.accountId);
      const conversation = await getHookoohConversation(path[1], auth.userId, auth.accountId);
      const lastUser = [...conversation.messages].reverse().find((item) => item.role === 'user');
      if (!lastUser) return NextResponse.json({ error: 'Nothing to regenerate' }, { status: 400 });
      const history = conversation.messages
        .filter((item) => item.id !== lastUser.id)
        .map((item) => ({ role: item.role as 'user' | 'assistant', content: item.content }));
      const reply = await answerHookooh({ question: lastUser.content, history });
      const saved = await addHookoohMessage(path[1], 'assistant', reply.text, reply.sources);
      return NextResponse.json({ message: saved, sources: reply.sources });
    }
    if (path[0] === 'messages' && path[1] && path[2] === 'feedback') {
      return NextResponse.json(await saveHookoohFeedback(path[1], auth.userId, String(body.vote || '')));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const body = await request.json().catch(() => ({}));
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    if (path[0] === 'settings') {
      if (!auth.canManageSettings) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json(await setHookoohEnabled(Boolean(body.enabled)));
    }
    if (path[0] === 'conversations' && path[1]) {
      return NextResponse.json(await renameHookoohConversation(path[1], auth.userId, auth.accountId, String(body.title || '')));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    if (path[0] === 'conversations' && path[1]) {
      return NextResponse.json(await deleteHookoohConversation(path[1], auth.userId, auth.accountId));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
