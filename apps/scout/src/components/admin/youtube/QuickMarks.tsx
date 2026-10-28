import VideoThumb from '@/components/admin/youtube/VideoThumb';
import SafeImage from '@/components/ui/SafeImage';

export function formatStamp(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? '↗' : '↘'} {up ? '+' : ''}{value}% <span className="font-medium text-slate-400">vs last 30 days</span>
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-emerald-50 text-emerald-700',
    generating: 'bg-emerald-50 text-emerald-700',
    processing: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-rose-50 text-rose-600',
  };
  const label: Record<string, string> = {
    ready: 'Completed',
    completed: 'Completed',
    generating: 'Processing',
    processing: 'Processing',
    failed: 'Failed',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || 'bg-slate-50 text-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'failed' ? 'bg-rose-500' : status === 'generating' || status === 'processing' ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
      {label[status] || status}
    </span>
  );
}

export function ThumbStack({ videos }: { videos: { thumbnail_url?: string; youtube_video_id?: string }[] }) {
  const shown = (videos || []).slice(0, 4);
  const extra = Math.max(0, (videos || []).length - shown.length);
  return (
    <span className="inline-flex items-center">
      {shown.map((video, index) => (
        <span key={`${video.youtube_video_id || index}`} className="relative h-8 w-8 overflow-hidden rounded-lg border-2 border-white bg-slate-100" style={{ marginLeft: index ? -8 : 0, zIndex: 10 - index }}>
          <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
        </span>
      ))}
      {extra ? <span className="ml-1 text-xs font-semibold text-violet-600">+{extra}</span> : null}
    </span>
  );
}

export function ChannelStack({ videos }: { videos: { channel_name?: string; channel_thumbnail_url?: string }[] }) {
  const unique: { name: string; thumb?: string }[] = [];
  for (const video of videos || []) {
    const name = video.channel_name || 'Channel';
    if (unique.some((item) => item.name === name)) continue;
    unique.push({ name, thumb: video.channel_thumbnail_url });
  }
  const shown = unique.slice(0, 4);
  return (
    <span className="inline-flex items-center">
      {shown.map((channel, index) => (
        <span key={channel.name} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-violet-100 text-[10px] font-bold text-violet-700" style={{ marginLeft: index ? -8 : 0, zIndex: 10 - index }}>
          {channel.thumb ? (
            <SafeImage src={channel.thumb} alt="" className="h-full w-full object-cover" fallback={<span className="flex h-full w-full items-center justify-center">{channel.name.slice(0, 1)}</span>} />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{channel.name.slice(0, 1)}</span>
          )}
        </span>
      ))}
    </span>
  );
}
