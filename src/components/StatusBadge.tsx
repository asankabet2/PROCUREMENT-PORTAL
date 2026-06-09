interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, string> = {
  'Open': 'badge-open',
  'Closed': 'badge-closed',
  'Awarded': 'badge-awarded',
  'Draft': 'badge-draft',
  'Pending': 'badge-pending',
  'Approved': 'badge-approved',
  'Rejected': 'badge-rejected',
  'Blacklisted': 'badge-blacklisted',
  'Submitted': 'badge-submitted',
  'Under Review': 'badge-under-review',
  'Shortlisted': 'badge-shortlisted',
  'Unsuccessful': 'badge-rejected',
  'Active': 'badge-approved',
  'Inactive': 'badge-draft',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const badgeClass = statusMap[status] || 'badge-draft';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass} ${className}`}>
      {status}
    </span>
  );
}
