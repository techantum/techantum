'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';

const input = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/account/profile')
      .then((res) => res.json())
      .then((data) => {
        setName(data.name || '');
        setEmail(data.email || '');
        setAvatarUrl(data.avatarUrl || '');
      })
      .catch(() => setMessage('Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append('name', name);
      if (file) body.append('file', file);
      const res = await fetch('/api/account/profile', { method: 'PUT', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save profile');
      setAvatarUrl(data.avatarUrl || '');
      setFile(null);
      setMessage('Profile saved.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading profile…</p>;

  const photo = preview || avatarUrl;
  const letter = (name || email || 'U').charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Edit profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your name and photo appear on the profile menu.</p>
      </div>
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex h-20 w-20 overflow-hidden rounded-full bg-violet-600 text-2xl font-bold text-white">
            {photo ? (
              <SafeImage src={photo} alt="" className="h-full w-full object-cover" fallback={<span className="flex h-full w-full items-center justify-center">{letter}</span>} />
            ) : (
              <span className="flex h-full w-full items-center justify-center">{letter}</span>
            )}
          </span>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Icon name="CameraIcon" size={16} /> Change photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0] || null;
                setFile(next);
                setPreview(next ? URL.createObjectURL(next) : '');
              }}
            />
          </label>
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Name
          <input className={input} value={name} placeholder="Enter name" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Email
          <input className={`${input} bg-slate-50 text-slate-500`} value={email} readOnly />
        </label>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
        <button type="button" className="mt-5 rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </section>
    </div>
  );
}
