import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ProjectForm from '@/components/admin/pm/ProjectForm';

export default function NewProjectPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Project" description="Choose the category, the account manager, the lead, and the developers. Project codes are generated on the server and are never reused." />
      <ProjectForm />
    </div>
  );
}
