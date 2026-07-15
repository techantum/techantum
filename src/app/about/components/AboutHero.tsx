import AppImage from '@/components/ui/AppImage';
import CmsRichText from '@/components/cms/CmsRichText';

interface AboutHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  description2: string;
  image: string;
  imageAlt: string;
}

export default function AboutHero({
  eyebrow,
  title,
  description,
  description2,
  image,
  imageAlt,
}: AboutHeroProps) {
  return (
    <section className="bg-gradient-to-b from-muted to-background page-hero reveal">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-12 items-center">
          <div className="reveal-left">
            <span className="font-inter text-xs sm:text-sm uppercase tracking-wider text-primary font-medium mb-3 sm:mb-4 block">
              {eyebrow}
            </span>
            <h1 className="font-bricolage text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              {title}
            </h1>
            <CmsRichText
              html={description}
              className="font-inter text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6"
            />
            {description2 && (
              <CmsRichText
                html={description2}
                className="font-inter text-base sm:text-lg text-muted-foreground"
              />
            )}
          </div>
          <div className="relative reveal-right">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <AppImage src={image} alt={imageAlt} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
