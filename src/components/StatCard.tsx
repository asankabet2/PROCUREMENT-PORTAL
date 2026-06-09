import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  iconColor?: string;
  onClick?: () => void;
}

export default function StatCard({ title, value, icon: Icon, trend, iconColor = 'text-primary', onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`stat-card ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-2">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-muted/50 ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
