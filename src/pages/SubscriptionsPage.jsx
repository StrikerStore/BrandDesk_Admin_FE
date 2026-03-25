import { useState, useEffect, useCallback } from 'react';
import { fetchWorkspaces } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import styles from './SubscriptionsPage.module.css';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchWorkspaces({
      plan: planFilter || undefined,
      status: statusFilter || undefined,
      onboarding_status: 'approved',
      page,
      limit: 25,
    })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planFilter, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const isTrialExpired = (ws) => {
    if (ws.plan !== 'trial' || !ws.trial_ends_at) return false;
    return new Date(ws.trial_ends_at) < new Date();
  };

  // Compute stats from current page (for the summary cards we'd need all data, but we can show loaded totals)
  const stats = data.reduce((acc, ws) => {
    acc[ws.plan] = (acc[ws.plan] || 0) + 1;
    return acc;
  }, {});

  const columns = [
    { key: 'name', label: 'Workspace', render: r => (
      <div>
        <div style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}
          onClick={() => navigate(`/workspaces/${r.id}`)}>
          {r.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.slug}</div>
      </div>
    )},
    { key: 'owner', label: 'Owner', render: r => (
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.owner_name || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.owner_email}</div>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: r => <StatusBadge status={r.plan} /> },
    { key: 'trial_ends_at', label: 'Trial Ends', render: r => (
      r.plan === 'trial' ? (
        <span style={{ fontSize: 12, color: isTrialExpired(r) ? '#dc2626' : 'var(--text)', fontWeight: isTrialExpired(r) ? 600 : 400 }}>
          {isTrialExpired(r) ? '⚠️ ' : ''}{formatDate(r.trial_ends_at)}
        </span>
      ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
    )},
    { key: 'brand_count', label: 'Brands', render: r => r.brand_count || 0 },
    { key: 'member_count', label: 'Members', render: r => r.member_count || 0 },
    { key: 'is_active', label: 'Status', render: r => <StatusBadge status={r.is_active ? 'active' : 'expired'} small /> },
    { key: 'created_at', label: 'Created', render: r => formatDate(r.created_at) },
  ];

  return (
    <div>
      <h1 className={styles.pageTitle}>Active Plans</h1>

      <div className={styles.revenueGrid}>
        <StatsCard label="Total Onboarded" value={total} />
        <StatsCard label="Trial" value={stats.trial || 0} />
        <StatsCard label="Starter" value={stats.starter || 0} />
        <StatsCard label="Pro" value={stats.pro || 0} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        emptyText={loading ? 'Loading...' : 'No onboarded workspaces found'}
        toolbar={<>
          <select className={tableStyles.filterSelect} value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
            <option value="">All plans</option>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>}
      />
    </div>
  );
}
