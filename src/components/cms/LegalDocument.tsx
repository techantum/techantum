import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import CmsRichText from '@/components/cms/CmsRichText';
import Icon from '@/components/ui/AppIcon';
import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';

export default async function LegalDocument({
  entryKey,
  icon,
}: {
  entryKey: 'legal.privacy' | 'legal.terms';
  icon: string;
}) {
  const content = mergeCmsContent(entryKey, await getCmsContent(entryKey));
  const eyebrow = String(content.eyebrow || '');
  const title = String(content.title || '');
  const summary = String(content.summary || '');
  const updated = String(content.updated || '');
  const body = String(content.body || '');

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        <section className="page-hero bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-16 pt-32">
          <div className="mx-auto max-w-4xl px-6">
            {eyebrow ? (
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Icon name={icon} size={24} />
                <span className="font-inter text-sm font-medium uppercase tracking-wider">{eyebrow}</span>
              </div>
            ) : null}
            <h1 className="mb-6 font-bricolage text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
            {summary ? <p className="mb-5 font-inter text-lg text-muted-foreground">{summary}</p> : null}
            {updated ? (
              <p className="font-inter text-sm text-muted-foreground">
                <strong>Last Updated:</strong> {updated}
              </p>
            ) : null}
          </div>
        </section>
        <section className="page-section">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <CmsRichText html={body} className="legal-document font-inter text-muted-foreground" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
