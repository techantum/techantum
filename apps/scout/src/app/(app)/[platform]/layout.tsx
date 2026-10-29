import { notFound } from 'next/navigation';
import YoutubeLayout from '../youtube/layout';
import { isResearchPlatformSlug } from '@/lib/research/platforms';

export default async function ResearchPlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  if (!isResearchPlatformSlug(platform)) notFound();
  return <YoutubeLayout>{children}</YoutubeLayout>;
}
