import AdminPageHeader from '@/components/admin/AdminPageHeader';

const REPORTS = [
  ['projects', 'Project Register'],
  ['ongoing', 'Ongoing Projects'],
  ['delivered', 'Delivered Projects'],
  ['daily', 'Daily Updates'],
  ['health', 'Development Health'],
  ['managers', 'Account Manager Summary'],
  ['team', 'Role Profiles'],
  ['allocations', 'Allocation by Project'],
  ['capacity', 'Allocation by Employee'],
  ['requirements', 'Requirements'],
  ['tickets', 'Tickets'],
  ['onboarding', 'Onboarding Readiness'],
  ['support', 'Support Status'],
  ['assets', 'Asset Register'],
  ['access', 'Access Register'],
  ['servers', 'Server & Cloud'],
  ['suppliers', 'Supplier Register'],
  ['software', 'Software Register'],
  ['backups', 'Backup Register'],
  ['incidents', 'Incident Register'],
  ['vulnerabilities', 'Vulnerability Register'],
  ['training', 'Training Register'],
  ['joiner-leaver', 'Joiner / Leaver'],
  ['changes', 'Change Register'],
  ['risks', 'Risk Register'],
  ['actions', 'Corrective Actions'],
  ['controls', 'Control Checklist'],
  ['process-health', 'Process Health Summary'],
  ['summary', 'Project Health Summary'],
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Reports" description="Excel exports of the current registers. Day-to-day work stays in the application." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map(([key, label]) => (
          <a key={key} href={`/api/admin/pm/reports/${key}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm hover:border-secondary">{label}</a>
        ))}
      </div>
    </div>
  );
}
