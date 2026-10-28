'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { NameField } from '@/components/ui/FormFields';
import { useProcess } from '@/components/ui/ProcessOverlay';
import SafeImage from '@/components/ui/SafeImage';
import { nameError } from '@/lib/forms/rules';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(true);
  const overlay = useProcess();
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
    setShowError(true);
    if (nameError(name)) {
      setMessage(nameError(name));
      return;
    }
    setMessage('');
    await overlay.run('Saving profile…', async () => {
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
      }
    });
  };

  if (loading) return <p className="text-sm text-slate-500">Loading profile…</p>;

  const photo = preview || avatarUrl;
  const letter = (name || email || 'U').charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Edit profile</h1>
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex h-20 w-20 overflow-hidden rounded-full bg-violet-600 text-2xl font-bold text-white">
            {photo ? (
              <SafeImage src={photo} alt="" className="h-full w-full object-cover" priority fallback={<span className="flex h-full w-full items-center justify-center">{letter}</span>} />
            ) : (
              <span className="flex h-full w-full items-center justify-center">{letter}</span>
            )}
          </span>
          <label className="btn-secondary cursor-pointer">
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
        <div className="mt-5">
          <NameField value={name} onValue={setName} showError={showError} />
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Email
          <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500" value={email} readOnly />
        </label>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
        <button type="button" className="btn-primary mt-5" onClick={() => void save()}>
          Save profile
        </button>
      </section>
    </div>
  );
}
