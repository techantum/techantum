import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export type AuthHighlight = {
  icon: string;
  title: string;
  description: string;
};

export default function AuthSplitShell({
  logo,
  kicker,
  title,
  subtitle,
  highlights,
  children,
  homeHref = '/',
}: {
  logo: React.ReactNode;
  kicker: string;
  title: React.ReactNode;
  subtitle: string;
  highlights: AuthHighlight[];
  children: React.ReactNode;
  homeHref?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F6F3EE]">
      <div className="grid min-h-screen lg:grid-cols-12">
        <section className="relative hidden overflow-hidden px-10 py-10 lg:col-span-7 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.9),transparent_50%)]" />
          <div className="relative">
            <Link href={homeHref} className="inline-flex items-center">
              {logo}
            </Link>
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{kicker}</p>
            <h1 className="mt-3 max-w-2xl font-bricolage text-4xl font-bold leading-tight tracking-tight text-slate-900 xl:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500">{subtitle}</p>
            <ul className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 text-secondary">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-slate-400">
            Secure workspace · Need help?{' '}
            <a href="mailto:info@techantum.com" className="font-medium text-secondary hover:underline">
              info@techantum.com
            </a>
          </p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:col-span-5 lg:bg-white lg:px-10 xl:px-14">
          <div className="w-full max-w-md lg:max-w-none">{children}</div>
        </section>
      </div>
    </main>
  );
}
