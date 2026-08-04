import CmsRichText from '@/components/cms/CmsRichText';

interface OverviewContent {
  introTitle: string;
  introDescription: string;
  visionTitle: string;
  visionDescription: string;
  historyTitle: string;
  historyDescription: string;
}

export default function AboutOverviewSection({ content }: { content: OverviewContent }) {
  return (
    <section className="page-section reveal">
      <div className="page-container max-w-4xl space-y-10">
        <div className="reveal">
          <h2 className="font-bricolage text-3xl font-bold text-foreground mb-4">{content.introTitle}</h2>
          <CmsRichText html={content.introDescription} className="font-inter text-lg text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal reveal-stagger">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bricolage text-xl font-semibold text-primary mb-3">{content.visionTitle}</h3>
            <CmsRichText html={content.visionDescription} className="font-inter text-muted-foreground" />
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bricolage text-xl font-semibold text-primary mb-3">{content.historyTitle}</h3>
            <CmsRichText html={content.historyDescription} className="font-inter text-muted-foreground" />
          </div>
        </div>
      </div>
    </section>
  );
}
