export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedMissingCmsEntries } = await import('@/lib/cms');
    seedMissingCmsEntries().catch((err) => console.error('Startup CMS seed failed:', err));

    const g = globalThis as { __techantumFollowupTimer?: ReturnType<typeof setInterval> };
    if (!g.__techantumFollowupTimer) {
      const run = async () => {
        try {
          const { runWhatsAppFollowups } = await import('@/lib/whatsapp/followup');
          const result = await runWhatsAppFollowups();
          if (result.sent > 0) console.log('[whatsapp followup]', result);
        } catch (err) {
          console.error('[whatsapp followup] failed', err);
        }
      };
      g.__techantumFollowupTimer = setInterval(run, 10 * 60 * 1000);
      setTimeout(run, 45 * 1000);
    }
  }
}
