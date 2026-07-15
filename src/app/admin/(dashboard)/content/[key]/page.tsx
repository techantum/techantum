'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ContentEditorModal from '@/components/admin/ContentEditorModal';
import { getDefaultEntryMeta } from '@/lib/cms/merge-entries';

/** Deep-link fallback — opens the section editor modal, then returns to Site Content. */
export default function ContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const key = decodeURIComponent((params?.key as string) || '');
  const meta = getDefaultEntryMeta(key);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!key) router.replace('/admin/content');
  }, [key, router]);

  if (!key) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-muted-foreground text-sm">
        Editing <span className="font-mono text-foreground">{key}</span>.{' '}
        <Link href="/admin/content" className="text-primary hover:underline">
          Back to Site Content
        </Link>
      </p>

      <ContentEditorModal
        entryKey={key}
        label={meta?.label || key}
        open={open}
        onClose={() => {
          setOpen(false);
          router.push('/admin/content');
        }}
      />
    </div>
  );
}
