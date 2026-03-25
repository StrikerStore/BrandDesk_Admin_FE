import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWorkspaces, suspendWorkspace, reactivateWorkspace } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './WorkspacesPage.module.css';

const FILTER_TABS = [
  { label: 'All', value: '', param: '' },
  { label: 'Pending Brands', value: 'pending_brands', param: 'brand_status' },
  { label: 'Pending Onboarding', value: 'pending_approval', param: 'onboarding_status' },
  { label: 'Approved', value: 'approved', param: 'onboarding_status' },
];

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [pendingBrandsCount, setPendingBrandsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const tab = FILTER_TABS.find(t => t.value === activeTab);
    const params = {
      search: search || undefined,
      plan: planFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 25,
    };
    if (tab && tab.param === 'brand_status' && tab.value) {
      params.brand_status = 'pending_approval';
    } else if (tab && tab.param === 'onboarding_status' && tab.value) {
      params.onboarding_status = tab.value;
    }
    fetchWorkspaces(params)
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, planFilter, statusFilter, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  // Keep pending brands count badge up to date
  useEffect(() => {
    fetchWorkspaces({ brand_status: 'pending_approval', limit: 1 })
      .then(r => setPendingBrandsCount(r.data.total))
      .catch(() => {});
  }, [data]);

  const handleSuspend = async (e, ws) => {
    e.stopPropagation();
    if (!confirm(`Suspend "${ws.name}"?`)) return;
    await (ws.is_active ? suspendWorkspace(ws.id) : reactivateWorkspace(ws.id));
    load();
  };

  const columns = [
    { key: 'name', label: 'Workspace', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'owner_name', label: 'Owner', render: r => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.owner_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.owner_email}</div>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: r => <StatusBadge status={r.plan} /> },
    { key: 'onboarding_status', label: 'Onboarding', render: r =>
      r.onboarding_status && r.onboarding_status !== 'approved'
        ? <StatusBadge status={r.onboarding_status.replace(/_/g, ' ')} small />
        : null
    },
    { key: 'pending_brands', label: 'Pending', render: r =>
      r.pending_brand_count > 0
        ? <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '1px 7px', borderRadius: 99,
            background: '#fffbeb', color: '#92400e',
            border: '1px solid #fcd34d',
          }}>{r.pending_brand_count} brand{r.pending_brand_count > 1 ? 's' : ''}</span>
        : null
    },
    { key: 'member_count', label: 'Members' },
    { key: 'brand_count', label: 'Brands' },
    { key: 'thread_count', label: 'Threads' },
    { key: 'created_at', label: 'Created', render: r => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.is_active ? 'active' : 'expired'} small /> },
    { key: 'actions', label: '', render: r => (
      <button
        className={`${tableStyles.actionBtn} ${r.is_active ? tableStyles.actionBtnDanger : ''}`}
        onClick={e => handleSuspend(e, r)}
      >
        {r.is_active ? 'Suspend' : 'Reactivate'}
      </button>
    )},
  ];

  return (
    <div>
      <h1 className={styles.pageTitle}>Workspaces</h1>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1); }}
            style={{
              padding: '8px 18px',
              fontWeight: activeTab === tab.value ? 700 : 400,
              borderBottom: activeTab === tab.value ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.value ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.value === 'pending_brands' && pendingBrandsCount > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff',
                borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700,
              }}>
                {pendingBrandsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        onRowClick={r => navigate(`/workspaces/${r.id}`)}
        emptyText={loading ? 'Loading...' : 'No workspaces found'}
        toolbar={<>
          <input
            className={tableStyles.searchInput}
            placeholder="Search by name, slug, or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
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

