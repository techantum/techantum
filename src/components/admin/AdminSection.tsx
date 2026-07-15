interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminSection({ title, description, children }: AdminSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
