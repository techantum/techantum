import { FinanceValidationError } from '@/lib/finance/errors';
import { createYoutube, type ResolvedChannel, type ResolvedVideo } from '@/lib/youtube/client';
import { asPlatform, type ResearchPlatform } from './platforms';
import { listLinkedInPosts, resolveLinkedInPage, searchLinkedInPages } from './linkedin';
import { listSocialPosts, resolveSocialPage, searchFacebookPages, searchInstagramPages } from './meta-graph';

export async function resolveResearchSource(platform: ResearchPlatform | string, input: string, youtubeKey: string): Promise<ResolvedChannel> {
  const kind = asPlatform(platform);
  if (kind === 'youtube') return createYoutube(youtubeKey).resolve(input);
  if (kind === 'linkedin') return resolveLinkedInPage(input);
  if (kind === 'facebook' || kind === 'instagram') return resolveSocialPage(kind, input);
  throw new FinanceValidationError('Choose YouTube, Facebook, Instagram, or LinkedIn.');
}

export async function searchResearchSources(platform: ResearchPlatform | string, query: string, youtubeKey: string): Promise<ResolvedChannel[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const kind = asPlatform(platform);
  if (kind === 'youtube') return createYoutube(youtubeKey).searchChannels(q);
  if (kind === 'facebook') return searchFacebookPages(q);
  if (kind === 'instagram') return searchInstagramPages(q);
  if (kind === 'linkedin') return searchLinkedInPages(q);
  return [];
}

export async function listResearchPosts(
  platform: ResearchPlatform | string,
  channel: { youtube_channel_id: string; channel_handle?: string | null; limit?: number; own?: boolean },
): Promise<ResolvedVideo[]> {
  const kind = asPlatform(platform);
  if (kind === 'linkedin') return listLinkedInPosts(channel.youtube_channel_id);
  if (kind === 'facebook' || kind === 'instagram') return listSocialPosts(kind, channel);
  throw new FinanceValidationError('Posts are fetched with Meta Graph or LinkedIn APIs.');
}
