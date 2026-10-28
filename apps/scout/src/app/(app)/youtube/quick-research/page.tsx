import { redirect } from 'next/navigation';

export default async function QuickResearchRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab;
  redirect(tab === 'report' ? '/youtube/quick-reports' : '/youtube/quick-analysis');
}
