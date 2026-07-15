import { getCmsContent } from '@/lib/cms';
import { mergeCmsContent } from '@/lib/cms/default-content';
import NotFoundActions from '@/components/NotFoundActions';

export default async function NotFound() {
  const content = mergeCmsContent('site.not_found', await getCmsContent('site.not_found'));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-primary opacity-20 mb-4">{String(content.code || '404')}</p>
        <h1 className="text-2xl font-medium text-foreground mb-2">{String(content.title || 'Page Not Found')}</h1>
        <p className="text-muted-foreground mb-5">{String(content.description || '')}</p>
        <NotFoundActions
          primaryCta={String(content.primaryCta || 'Back to Home')}
          primaryCtaHref={String(content.primaryCtaHref || '/')}
          secondaryCta={String(content.secondaryCta || 'Go Back')}
        />
      </div>
    </div>
  );
}
