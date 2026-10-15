interface AdminFormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
};

export default function AdminFormGrid({ children, cols = 4, className = '' }: AdminFormGridProps) {
  return <div className={`grid ${colClasses[cols]} gap-4 ${className}`}>{children}</div>;
}
