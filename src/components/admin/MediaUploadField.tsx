'use client';

import { useState } from 'react';

interface MediaUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  mediaType: 'image' | 'video';
  hint?: string;
}

export default function MediaUploadField({
  label,
  value,
  onChange,
  mediaType,
  hint,
}: MediaUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const accept =
    mediaType === 'video'
      ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'
      : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('mediaType', mediaType);

      const res = await fetch('/api/admin/upload/media', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
        <div className="relative w-full h-40 bg-muted/40 overflow-hidden flex items-center justify-center">
          {value ? (
            mediaType === 'video' ? (
              <video
                src={value}
                className="w-full h-full object-contain"
                muted
                playsInline
                controls
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt={label} className="w-full h-full object-contain" />
            )
          ) : (
            <span className="text-xs text-muted-foreground">No {mediaType} uploaded</span>
          )}
        </div>

        <div className="p-3 space-y-2 border-t border-border bg-white">
          <input
            type="file"
            accept={accept}
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Remove {mediaType}
            </button>
          ) : null}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {error && <p className="text-xs text-secondary">{error}</p>}
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        </div>
      </div>
    </div>
  );
}
