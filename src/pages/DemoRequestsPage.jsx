import { useState, useEffect, useCallback } from 'react';
import { fetchDemoRequests, updateDemoStatus } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './DemoRequestsPage.module.css';

const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function DemoRequestsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchDemoRequests({ status: statusFilter || undefined, page, limit: 25 })
      .then(r => { setData(r.data.data); setTotal(r.data.total); setCounts(r.data.counts || {}); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (row) => {
    setDetail(row);
    setNotes(row.admin_notes || '');
  };

  const handleStatusChange = async (newStatus) => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateDemoStatus(detail.id, { status: newStatus, admin_notes: notes });
      setDetail(prev => ({ ...prev, status: newStatus, admin_notes: notes }));
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'id', label: '#', render: r => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{r.id}</span> },
    { key: 'brand_name', label: 'Brand', render: r => (
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.brand_name}</div>
        {r.brand_type && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.brand_type}</div>}
      </div>
    )},
    { key: 'contact', label: 'Contact', render: r => (
      <div style={{ fontSize: 12 }}>
        <div>{r.contact_name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.contact_email}</div>
        {r.contact_phone && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.contact_phone}</div>}
      </div>
    )},
    { key: 'platform', label: 'Platform', render: r => (
      <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{r.platform}</span>
    )},
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status === 'new' ? 'open' : r.status} small /> },
    { key: 'created_at', label: 'Requested', render: r => <span style={{ fontSize: 12 }}>{formatDate(r.created_at)}</span> },
  ];

  const newCount = counts.new || 0;

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>
          Demo Requests
          {newCount > 0 && <span className={styles.newCount}>{newCount}</span>}
        </h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        onRowClick={openDetail}
        emptyText={loading ? 'Loading...' : 'No demo requests yet'}
        toolbar={
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      />

      {/* Detail Modal */}
      {detail && (
        <div className={styles.overlay} onClick={() => setDetail(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Demo Request #{detail.id}</div>
              <button className={styles.closeBtn} onClick={() => setDetail(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Brand Name</div>
                  <div className={styles.infoValue}>{detail.brand_name}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Brand Type</div>
                  <div className={styles.infoValue}>{detail.brand_type || '—'}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Platform</div>
                  <div className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{detail.platform}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Website</div>
                  <div className={styles.infoValue}>
                    {detail.website ? <a href={detail.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{detail.website}</a> : '—'}
                  </div>
                </div>
              </div>

              <div className={styles.contactSection}>
                <div className={styles.infoLabel}>Contact Person</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{detail.contact_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.contact_email}</div>
                {detail.contact_phone && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail.contact_phone}</div>}
              </div>

              {detail.message && (
                <div className={styles.messageSection}>
                  <div className={styles.infoLabel}>Message</div>
                  <div className={styles.messageText}>{detail.message}</div>
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Requested on {formatDate(detail.created_at)}
              </div>

              <div className={styles.notesSection}>
                <div className={styles.infoLabel}>Admin Notes</div>
                <textarea
                  className={styles.notesInput}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                />
              </div>

              <div className={styles.statusActions}>
                <div className={styles.infoLabel}>Update Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['new', 'contacted', 'completed', 'cancelled'].map(s => (
                    <button
                      key={s}
                      className={`${styles.statusBtn} ${detail.status === s ? styles.statusBtnActive : ''}`}
                      onClick={() => handleStatusChange(s)}
                      disabled={saving}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
