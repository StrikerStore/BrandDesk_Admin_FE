const STYLES = {
  active:    { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  trial:     { bg: 'var(--blue-bg)',   color: 'var(--blue)',   border: '#93c5fd' },
  starter:   { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  pro:       { bg: '#f5f3ff',          color: '#7c3aed',       border: '#c4b5fd' },
  cancelled: { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)' },
  expired:   { bg: '#f9fafb',          color: '#6b7280',       border: '#d1d5db' },
  past_due:  { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  pending:   { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  success:   { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  failure:   { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)' },
  admin:     { bg: '#f5f3ff',          color: '#7c3aed',       border: '#c4b5fd' },
  agent:     { bg: '#f9fafb',          color: '#6b7280',       border: '#d1d5db' },
  inactive:  { bg: '#f9fafb',          color: '#6b7280',       border: '#d1d5db' },
  owner:     { bg: 'var(--blue-bg)',   color: 'var(--blue)',   border: '#93c5fd' },
  // Demo statuses
  contacted:   { bg: 'var(--blue-bg)',   color: 'var(--blue)',   border: '#93c5fd' },
  completed:   { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  // Ticket statuses
  open:        { bg: 'var(--blue-bg)',   color: 'var(--blue)',   border: '#93c5fd' },
  in_progress: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  resolved:    { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  closed:      { bg: '#f9fafb',          color: '#6b7280',       border: '#d1d5db' },
  // Priority
  low:         { bg: '#f9fafb',          color: '#6b7280',       border: '#d1d5db' },
  medium:      { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  high:        { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)' },
  // Brand statuses
  draft:             { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
  'pending approval':{ bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  approved:          { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' },
  rejected:          { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-border)' },
};

export default function StatusBadge({ status, small }) {
  if (!status) return null;
  const s = STYLES[status.toLowerCase()] || STYLES.pending;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 99,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
