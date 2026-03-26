import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, deactivateUser, reactivateUser, deleteUser } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './UsersPage.module.css';

export default function UsersPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [allBrands, setAllBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchUsers({
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      brand_name: brandFilter || undefined,
      page,
      limit: 25,
    })
      .then(r => {
        setData(r.data.data);
        setTotal(r.data.total);
        if (r.data.brands) setAllBrands(r.data.brands);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter, brandFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = (e, user) => {
    e.stopPropagation();
    setConfirmModal({
      title: user.is_active ? '⚠️ Deactivate User' : '✅ Reactivate User',
      message: `${user.is_active ? 'Deactivate' : 'Reactivate'} "${user.name}" (${user.email})?`,
      danger: user.is_active,
      btnLabel: user.is_active ? 'Deactivate' : 'Reactivate',
      onConfirm: async () => {
        await (user.is_active ? deactivateUser(user.id) : reactivateUser(user.id));
        load();
      },
    });
  };

  const handleDelete = (e, user) => {
    e.stopPropagation();
    setConfirmModal({
      title: '🗑️ Delete User',
      message: `Permanently delete "${user.name}" (${user.email})? This will also remove them from all workspaces. This action cannot be undone.`,
      danger: true,
      btnLabel: 'Delete',
      onConfirm: async () => {
        await deleteUser(user.id);
        load();
      },
    });
  };

  const columns = [
    { key: 'name', label: 'Name', render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {r.avatar_url ? (
          <img src={r.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
            {r.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span style={{ fontWeight: 600 }}>{r.name}</span>
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'brands', label: 'Brands', render: r => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {r.brands && r.brands.length > 0 ? r.brands.map(b => (
          <span key={b} style={{
            display: 'inline-block', fontSize: 10, fontWeight: 600,
            padding: '1px 7px', borderRadius: 99,
            background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
            whiteSpace: 'nowrap',
          }}>{b}</span>
        )) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
        )}
      </div>
    )},
    { key: 'role', label: 'Role', render: r => <StatusBadge status={r.role} small /> },
    { key: 'created_at', label: 'Created', render: r => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.is_active ? 'active' : 'expired'} small /> },
    { key: 'actions', label: '', render: r => r.role === 'admin' ? null : (
      <div className={tableStyles.actions}>
        <button
          className={`${tableStyles.actionBtn} ${r.is_active ? tableStyles.actionBtnDanger : ''}`}
          onClick={e => handleToggle(e, r)}
        >
          {r.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
        <button
          className={`${tableStyles.actionBtn} ${tableStyles.actionBtnDanger}`}
          onClick={e => handleDelete(e, r)}
        >
          Delete
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <h1 className={styles.pageTitle}>Users</h1>
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        emptyText={loading ? 'Loading...' : 'No users found'}
        toolbar={<>
          <input
            className={tableStyles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className={tableStyles.filterSelect} value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }}>
            <option value="">All brands</option>
            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className={tableStyles.filterSelect} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
            <option value="agent">Agent</option>
          </select>
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>}
      />

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />
      )}
    </div>
  );
}

function ConfirmModal({ title, message, btnLabel = 'Confirm', danger, onConfirm, onClose }) {
  const [running, setRunning] = useState(false);

  const handleConfirm = async () => {
    setRunning(true);
    try { await onConfirm(); onClose(); } catch { setRunning(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg, #fff)', borderRadius: 12,
        width: 420, maxWidth: '92vw', padding: '28px 28px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: danger ? '#dc2626' : 'var(--text)', marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, fontSize: 13, border: '1px solid var(--border, #ddd)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={running} style={{
            padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: danger ? '#dc2626' : 'var(--accent)', color: '#fff', opacity: running ? 0.6 : 1,
          }}>{running ? 'Processing...' : btnLabel}</button>
        </div>
      </div>
    </div>
  );
}
