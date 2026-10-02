import { memo } from 'react';

interface StatusProps {
  status?: string | number | null;
  className?: string;
  label?: string;
}

const statusClassMap: { [key: string]: string } = {
  scheduled: 'bg-sky-100 text-sky-600',
  pending: 'bg-blue-100 text-blue-500',
  running: 'bg-yellow-100 text-yellow-500',
  in_progress: 'bg-orange-100 text-orange-500',
  inprogress: 'bg-orange-100 text-orange-500',
  'in-progress': 'bg-orange-100 text-orange-500',
  ongoing: 'bg-orange-100 text-orange-500',

  opened: 'bg-yellow-100 text-yellow-500',
  preparing: 'bg-yellow-100 text-yellow-500',
  'rider_assigned': 'bg-blue-100 text-blue-500',
  worker_assigned: 'bg-indigo-100 text-indigo-600',
  ready: 'bg-purple-100 text-purple-500',
  ready_for_pickup: 'bg-purple-100 text-purple-500',
  'out_of_delivery': 'bg-orange-500/30 text-orange-500',
  in_transit: 'bg-orange-500/30 text-orange-500',

  completed: 'bg-green-500/30 text-green-500',
  delivered: 'bg-green-500/30 text-green-500',
  closed: 'bg-green-500/30 text-green-500',
  approved: 'bg-green-500/30 text-green-500',
  approved_by_admin: 'bg-blue-500/30 text-blue-500',
  refunded: 'bg-green-500/30 text-green-500',
  claimed: 'bg-green-500/30 text-green-500',
  transfered: 'bg-green-500/30 text-green-500',
  active: 'bg-green-500/30 text-green-500',
  accepted: 'bg-cyan-500/30 text-cyan-500',
  assigned: 'bg-cyan-500/30 text-cyan-500',
  resolved: 'bg-green-500/30 text-green-500',
  confirmed: 'bg-emerald-500/30 text-emerald-600',

  paid: 'bg-green-500/30 text-green-500',
  unpaid: 'bg-red-500/30 text-red-500',
  instock: 'bg-green-500/30 text-green-500',
  in_stock: 'bg-green-500/30 text-green-500',
  out_of_stock: 'bg-red-500/30 text-red-500',

  declined: 'bg-red-500/30 text-red-500',
  inactive: 'bg-red-500/30 text-red-500',
  blocked: 'bg-red-500/30 text-red-500',
  cancelled: 'bg-red-500/30 text-red-500',
  canceled: 'bg-red-500/30 text-red-500',
  rejected: 'bg-red-500/30 text-red-500',
  expired: 'bg-red-500/30 text-red-500',

  dispatched: 'bg-cyan-500/30 text-cyan-500',

  failed: 'bg-orange-500/30 text-orange-500',
  out_for_delivery: 'bg-orange-500/30 text-orange-500',
  onHold: 'bg-orange-500/30 text-orange-500',
  deactivated: 'bg-orange-500/30 text-orange-500',
  unmatched: 'bg-muted text-muted-foreground',
  missed: 'bg-muted text-muted-foreground',
};

const formatStatusLabel = (value: string) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const Status = ({ status, className, label }: StatusProps) => {
  const rawStatus = String(status ?? '');
  const normalizedStatus = rawStatus.toLowerCase().replace(/ /g, '_');
  const statusClass = statusClassMap[normalizedStatus] ?? '';
  const resolvedLabel = label ?? formatStatusLabel(rawStatus);

  return (
    <div
      className={`
      ${statusClass}
      text-xs px-2 rounded-xl flex items-center gap-1 py-1 pb-1.5 font-medium w-fit capitalize
      ${className ?? ''}
    `}
    >
      <span>{resolvedLabel}</span>
    </div>
  );
};

export default memo(Status);
