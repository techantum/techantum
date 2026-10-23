'use client';

import { ProjectRequired } from '@/components/admin/youtube/YoutubeFrame';

function Reports() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <h2 className="font-bricolage text-2xl font-bold tracking-tight text-slate-900">Reports</h2>
      <p className="mt-2 text-sm text-slate-500">Coming soon.</p>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProjectRequired>
      <Reports />
    </ProjectRequired>
  );
}
