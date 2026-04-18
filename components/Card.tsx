import { classNames } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={classNames(
        'bg-card rounded-card p-4 shadow-card border border-[#F0F0F0]',
        className || ''
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  type?: 'default' | 'success' | 'danger';
}

export function StatCard({ label, value, subValue, type = 'default' }: StatCardProps) {
  const valueColor = type === 'success' ? 'text-success' : type === 'danger' ? 'text-danger' : 'text-text-primary';
  
  return (
    <Card className="hover:shadow-card-hover transition-shadow duration-200">
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p className={`text-xl lg:text-2xl font-bold ${valueColor}`}>{value}</p>
      {subValue && <p className="text-xs text-text-secondary mt-1">{subValue}</p>}
    </Card>
  );
}