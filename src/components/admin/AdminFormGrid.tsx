interface AdminFormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export default function AdminFormGrid({ children, cols = 3, className = '' }: AdminFormGridProps) {
  return <div className={`grid ${colClasses[cols]} gap-4 ${className}`}>{children}</div>;
}
