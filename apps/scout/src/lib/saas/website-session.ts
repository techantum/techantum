import { isStaffAdmin } from '@/lib/admin/roles';
import { accountIsActive, getPlatformActor } from './session';

export async function websiteSession() {
  const actor = await getPlatformActor();
  if (!actor) {
    return { signedIn: false, userName: '', userEmail: '', avatarUrl: null as string | null, canOpenWorkspace: false, actor: null };
  }
  return {
    signedIn: true,
    userName: actor.name || actor.email,
    userEmail: actor.email,
    avatarUrl: actor.avatarUrl || null,
    canOpenWorkspace: isStaffAdmin(actor.role) || Boolean(actor.account && accountIsActive(actor.account)),
    actor,
  };
}
