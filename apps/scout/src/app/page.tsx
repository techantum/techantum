import Link from 'next/link';
import EmailCapture from '@/components/marketing/EmailCapture';
import Faq from '@/components/marketing/Faq';
import Hero from '@/components/marketing/Hero';
import { PLATFORM_MARKS } from '@/components/marketing/BrandIcons';
import Pricing from '@/components/marketing/Pricing';
import { BTN, COPY, H2, SHELL } from '@/components/marketing/layout';
import SiteFooter from '@/components/marketing/SiteFooter';
import SiteHeader from '@/components/marketing/SiteHeader';
import Icon from '@/components/ui/AppIcon';
import { getRevealeoSite } from '@/lib/cms/site';
import SafeImage from '@/components/ui/SafeImage';

export const dynamic = 'force-dynamic';

const LOGOS = ['nike', 'amazon', 'hubspot', 'notion', 'spotify', 'Canva', 'Shopify', 'Adobe'];

const STEPS = [
  { n: '1', icon: 'CursorArrowRaysIcon', t: 'Select platform', d: 'Choose from YouTube, Instagram, Facebook and more', tone: 'bg-[#7C3AED] text-white' },
  { n: '2', icon: 'PlusIcon', t: 'Create project', d: 'Set up a project for your competitor or niche', tone: 'bg-[#F9A8D4] text-[#BE185D]' },
  { n: '3', icon: 'CircleStackIcon', t: 'Import content', d: 'Fetch posts, videos, ads and metrics', tone: 'bg-[#EDE9FE] text-[#7C3AED]' },
  { n: '4', icon: 'MagnifyingGlassIcon', t: 'AI analysis', d: 'Analyze visuals, text, transcripts and more', tone: 'bg-[#F5F3FF] text-[#A78BFA]' },
  { n: '5', icon: 'ChartBarIcon', t: 'Compare', d: 'View side-by-side competitor insights', tone: 'bg-[#F5F3FF] text-[#A78BFA]' },
  { n: '6', icon: 'ShareIcon', t: 'Export', d: 'Save reports and share with your team', tone: 'bg-[#F5F3FF] text-[#A78BFA]' },
];

function text(section: Record<string, unknown> | undefined, key: string, fallback: string) {
  const value = section?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function lines(section: Record<string, unknown> | undefined, key: string, fallback: string[]) {
  const value = section?.[key];
  return Array.isArray(value) && value.length ? value.map((item) => String(item)) : fallback;
}

export default async function LandingPage() {
  const { branding, content } = await getRevealeoSite();
  const hero = content.hero || {};
  const features = content.features || {};
  const platforms = content.platforms || {};
  const workflow = content.workflow || {};
  const ai = content.ai || {};
  const compare = content.compare || {};
  const faq = content.faq || {};
  const cta = content.cta || {};
  const faqItems = Array.isArray(faq.items) ? faq.items as { q: string; a: string }[] : undefined;
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteHeader branding={branding} />
      <Hero
        title={text(hero, 'title', 'Uncover your competitors’')}
        highlight={text(hero, 'highlight', 'marketing secrets')}
        description={text(hero, 'description', 'Turn public data from YouTube, Instagram, Facebook, Ads and more into actionable insights. See what works, then recreate winning content, faster.')}
        image={text(hero, 'image', '/marketing/hero-dashboard.jpg')}
      />

      <section className="border-t border-slate-100 py-10">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Trusted by marketers at</p>
        <div className={`${SHELL} flex flex-wrap items-center justify-center gap-x-12 gap-y-3`}>
          {LOGOS.map((name) => (
            <span key={name} className="font-bricolage text-[18px] font-bold capitalize tracking-tight text-[#C4C8D4]">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className={`${SHELL} grid items-center gap-10 py-16 lg:grid-cols-[0.95fr_1.15fr] lg:gap-8 lg:py-20`}>
        <div className="relative max-w-lg">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-500">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {text(features, 'eyebrow', 'From noise to insight')}
          </p>
          <h2 className={H2}>
            {text(features, 'title', 'Public data is a goldmine\n— if you know where to look.').split('\n').map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </h2>
          <p className={`${COPY} max-w-md`}>
            {text(features, 'description', 'Your competitors are already showing you what works. We turn publicly available content into clear, actionable insights so you can make smarter marketing decisions.')}
          </p>
          <svg className="pointer-events-none absolute -right-6 bottom-4 hidden h-16 w-24 text-violet-300 lg:block" viewBox="0 0 96 64" fill="none" aria-hidden>
            <path d="M8 12c22 4 48 8 72 28" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" />
            <path d="M70 32l18 8-14 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-[22px] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <Icon name="XMarkIcon" size={14} />
              </span>
              The old way
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-slate-600">
              {lines(features, 'oldWay', ['Manually check competitor channels', 'Spend hours watching videos', 'No easy way to compare', 'Miss valuable insights', 'Slow, inconsistent research']).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                    <Icon name="XMarkIcon" size={10} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-[22px] bg-[#F6F2FF] p-6 ring-1 ring-violet-100">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Icon name="CheckIcon" size={14} />
              </span>
              With Hookooh
            </h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-slate-600">
              {lines(features, 'withRevealeo', ['All platforms in one place', 'Automated data collection', 'AI-powered analysis', 'Compare competitors easily', 'Export and share insights']).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <Icon name="CheckIcon" size={10} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="product" className="relative overflow-hidden pb-20 pt-4">
        <div className="pointer-events-none absolute inset-x-0 top-8 h-[420px] bg-[radial-gradient(ellipse_at_top,#F3E8FF_0%,transparent_70%)]" />
        <div className={`${SHELL} relative`}>
          <p className="pointer-events-none absolute right-8 top-10 hidden max-w-[140px] rotate-[8deg] text-center font-bricolage text-[13px] font-semibold leading-5 text-[#C026D3] lg:block">
            Support for all
            <br />
            major platforms
            <span className="mt-1 block text-lg leading-none">↙</span>
          </p>
          <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-500">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {text(platforms, 'eyebrow', 'Multi-platform intelligence')}
          </p>
          <h2 className={`${H2} max-w-xl`}>{text(platforms, 'title', 'All your competitor research in one place.')}</h2>
          <p className={`${COPY} max-w-xl`}>
            {text(platforms, 'description', 'Create platform-based projects and uncover insights from every major channel. Compare content, analyze what’s working, and find new opportunities across the entire social media landscape.')}
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {PLATFORM_MARKS.map(({ name, blurb, Icon: Mark }) => (
              <div key={name} className="flex flex-col items-center rounded-[22px] bg-white px-3 py-6 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
                <Mark className="h-12 w-12" />
                <p className="mt-3 text-[14px] font-bold text-slate-800">{name}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`${SHELL} pb-16 pt-8`}>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          {text(workflow, 'eyebrow', 'Simple, powerful workflow')}
        </p>
        <h2 className={`${H2} mt-4`}>{text(workflow, 'title', 'From data to insights in minutes.')}</h2>
        <p className={`${COPY} max-w-xl`}>{text(workflow, 'description', 'Get from a competitor’s channel to actionable insights in just a few clicks.')}</p>
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <span className="pointer-events-none absolute left-[8%] right-[8%] top-[22px] hidden border-t border-dotted border-violet-200 lg:block" />
          {STEPS.map((step) => (
            <li key={step.n} className="relative text-center">
              <span className={`relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full ${step.tone}`}>
                <Icon name={step.icon} size={20} />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-slate-900">
                {step.n}. {step.t}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="ai" className="relative overflow-hidden bg-gradient-to-r from-[#2E1065] via-[#6D28D9] to-[#DB2777] py-16 text-white">
        <div className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-[#4C1D95]/80" />
        <div className={`${SHELL} relative grid items-center gap-10 lg:grid-cols-[0.85fr_1.25fr]`}>
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-100">
              {text(ai, 'eyebrow', 'AI-powered analysis')}
            </p>
            <h2 className="mt-4 font-bricolage text-[2.4rem] font-bold leading-[1.1] sm:text-[2.8rem]">{text(ai, 'title', 'Deeper insights with AI.')}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-white/75">
              {text(ai, 'description', 'Our AI analyzes every part of your competitors’ content — from thumbnails and visuals to captions, transcripts and key themes.')}
            </p>
            <Link href="/signup" className="mt-8 inline-flex h-11 items-center gap-1 rounded-full bg-[#E879F9] px-5 text-sm font-semibold text-white hover:bg-[#F0ABFC]">
              {text(ai, 'cta', 'See AI analysis in action →')}
            </Link>
          </div>
          <div className="relative grid items-center gap-3 lg:grid-cols-[1fr_0.72fr]">
            <div className="relative">
              <div className="absolute -left-4 -top-10 z-10 w-44 rounded-2xl bg-white p-3 text-slate-800 shadow-lg">
                <p className="text-[12px] font-semibold">Thumbnail Analysis</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Bright colors, landscape, text overlay. High engagement potential.</p>
              </div>
              <div className="overflow-hidden rounded-[22px] bg-white text-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.28)]">
                <div className="relative">
                  <SafeImage src={text(ai, 'image', '/marketing/ai-california-lake.jpg')} alt="" className="h-44 w-full object-cover" />
                  <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-violet-600">▶</span>
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">10:24</span>
                  <span className="absolute -left-2 bottom-16 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">94/100</span>
                </div>
                <div className="p-3">
                  <p className="text-[14px] font-bold">Exploring the Hidden Gems of California</p>
                  <p className="mt-1 text-[11px] text-slate-500">👁 125,430 · ❤ 4,321 · 💬 312</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-2">
                      <SafeImage src="/marketing/avatar-2.jpg" alt="" className="h-6 w-6 rounded-full object-cover" />
                      Travel Explorer · 1.2M subscribers
                    </span>
                    <span className="font-semibold text-violet-600">View on YouTube</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -left-2 z-10 w-44 rounded-2xl bg-white p-3 text-slate-800 shadow-lg">
                <p className="text-[12px] font-semibold">Image OCR</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Found text: “California” “Hidden Gems” “Explore More”</p>
              </div>
            </div>
            <div className="mt-10 space-y-3 lg:mt-0">
              {[
                { t: 'Video Analysis', d: '10:24 duration. Travel & adventure niche. High audience retention.' },
                { t: 'Caption Analysis', d: 'Key themes: travel, nature, hidden gems, adventure. Positive sentiment.' },
                { t: 'Competitor Comparison', d: 'Performs 2.3x better than competitor average. +340% higher engagement.' },
              ].map((card) => (
                <div key={card.t} className="rounded-2xl bg-white p-3.5 text-slate-800 shadow-lg">
                  <p className="text-[13px] font-semibold">{card.t}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{card.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className={`${SHELL} grid items-start gap-10 py-24 lg:grid-cols-[0.78fr_1.22fr]`}>
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {text(compare, 'eyebrow', 'Simple. Find opportunities')}
          </p>
          <h2 className={`${H2} mt-4`}>{text(compare, 'title', 'Compare content side-by-side.')}</h2>
          <p className={COPY}>
            {text(compare, 'description', 'Easily compare your competitors’ best performing content, spot trends and find new opportunities for your own strategy.')}
          </p>
          <Link href="/signup" className={`${BTN} mt-8 gap-1`}>
            {text(compare, 'cta', 'Start comparing →')}
          </Link>
        </div>
        <div className="rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(109,40,217,0.08)] ring-1 ring-slate-100">
          <div className="mb-3 flex items-center justify-between text-[12px] font-semibold">
            <span className="text-slate-800">▶ Compare Videos</span>
            <span className="text-violet-500">Select videos to compare</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { src: '/marketing/ai-california-lake.jpg', title: 'Exploring the Hidden Gems…', meta: 'Travel Explorer · 10:24', time: 'Jun 12, 2024' },
                  { src: '/marketing/compare-sf-skyline.jpg', title: 'A Day in San Francisco', meta: 'City Guide · 8:17', time: 'Jan 10, 2024' },
                ].map((item) => (
                  <article key={item.title}>
                    <div className="relative overflow-hidden rounded-xl">
                      <SafeImage src={item.src} alt="" className="h-24 w-full object-cover" />
                      <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-violet-600">▶</span>
                    </div>
                    <p className="mt-2 text-[12px] font-semibold text-slate-800">{item.title}</p>
                    <p className="text-[10px] text-slate-500">{item.meta}</p>
                    <p className="text-[10px] text-slate-400">{item.time}</p>
                  </article>
                ))}
              </div>
              <table className="mt-4 w-full text-[12px]">
                <tbody className="text-slate-600">
                  {[
                    ['Views', '125,430', '98,210'],
                    ['Likes', '4,321', '3,102'],
                    ['Comments', '312', '280'],
                    ['Engagement Rate', '3.7%', '3.4%'],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-slate-100">
                      <td className="py-1.5">{row[0]}</td>
                      <td className="py-1.5 text-right font-medium text-slate-800">{row[1]}</td>
                      <td className="py-1.5 text-right font-medium text-slate-800">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside>
              <p className="text-[12px] font-semibold text-slate-800">AI Insights</p>
              <ul className="mt-2 space-y-2 text-[11px] leading-4 text-slate-600">
                <li>○ Video 1 has 28% higher engagement rate</li>
                <li>× Both use bright, scenic thumbnails</li>
                <li>× Video 1 performs better with longer duration</li>
                <li>○ Similar audience and content themes</li>
              </ul>
              <div className="mt-4 rounded-2xl bg-[#F3E8FF] p-3">
                <p className="text-[12px] font-semibold text-violet-700">Opportunity</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">Create more destination-focused content with scenic visuals</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Pricing />

      <section id="faq" className={`${SHELL} grid items-start gap-10 pb-16 pt-4 lg:grid-cols-[0.85fr_1.25fr]`}>
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-500">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {text(faq, 'eyebrow', 'Frequently asked questions')}
          </p>
          <h2 className={`${H2} mt-4`}>
            {text(faq, 'title', 'Got questions?\nWe’ve got answers.').split('\n').map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </h2>
          <p className={`${COPY} mt-4 max-w-sm`}>
            {text(faq, 'description', 'Everything you need to know about Hookooh and how it can help you make better marketing decisions.')}
          </p>
        </div>
        <Faq items={faqItems && faqItems.length ? faqItems : undefined} />
      </section>

      <section className={`${SHELL} pb-6`}>
        <div className="rounded-[24px] bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#E879F9] px-8 py-10 text-white lg:flex lg:items-center lg:justify-between lg:px-12">
          <div className="max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{text(cta, 'eyebrow', 'Ready to uncover your competitors’ secrets?')}</p>
            <h2 className="mt-2 font-bricolage text-[2rem] font-bold leading-tight">{text(cta, 'title', 'Start your free trial today.')}</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/80">
              {text(cta, 'description', 'Join thousands of marketers who use Hookooh to find opportunities, create better content and stay ahead of the competition.')}
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <EmailCapture light />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/85">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter branding={branding} />
    </div>
  );
}
