import SiteFooter from '@/components/marketing/SiteFooter';
import SiteHeader from '@/components/marketing/SiteHeader';
import { SHELL } from '@/components/marketing/layout';
import { getRevealeoSite } from '@/lib/cms/site';
import { websiteSession } from '@/lib/saas/website-session';

function LegalBody({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-600">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        if (lines[0].startsWith('# ')) {
          const heading = lines[0].replace(/^#\s+/, '');
          const rest = lines.slice(1);
          return (
            <div key={index} className="space-y-2">
              <h2 className="pt-4 font-bricolage text-2xl font-bold text-slate-900">{heading}</h2>
              {rest.length ? <p>{rest.join(' ')}</p> : null}
            </div>
          );
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line) => (
                <li key={line}>{line.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{lines.join(' ')}</p>;
      })}
    </div>
  );
}

export default async function LegalPage({ sectionKey }: { sectionKey: 'privacy' | 'terms' }) {
  const [{ branding, content }, session] = await Promise.all([getRevealeoSite(), websiteSession()]);
  const section = content[sectionKey] || {};
  const title = String(section.title || (sectionKey === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'));
  const description = String(section.description || '');
  const updated = String(section.updated || '');
  const body = String(section.body || '');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader
        solid
        branding={branding}
        signedIn={session.signedIn}
        userName={session.userName}
        userEmail={session.userEmail}
        avatarUrl={session.avatarUrl}
        canOpenWorkspace={session.canOpenWorkspace}
      />
      <main className={`${SHELL} pb-20 pt-28`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Legal</p>
        <h1 className="mt-3 font-bricolage text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-500">{description}</p> : null}
        {updated ? <p className="mt-3 text-sm text-slate-400">Last updated: {updated}</p> : null}
        <div className="mt-10 max-w-3xl border-t border-slate-100 pt-8">
          <LegalBody text={body} />
        </div>
      </main>
      <SiteFooter branding={branding} />
    </div>
  );
}
