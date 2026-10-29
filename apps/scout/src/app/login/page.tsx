import { redirect } from 'next/navigation';

export default async function LoginAliasPage({ searchParams }: { searchParams: Promise<{ package?: string; error?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.package) query.set('package', params.package);
  if (params.error) query.set('error', params.error);
  redirect(`/subscriber/login${query.size ? `?${query}` : ''}`);
}
