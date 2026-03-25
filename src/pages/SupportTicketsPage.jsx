import { useState, useEffect, useCallback } from 'react';
import { fetchAdminTickets, fetchAdminTicket, replyAdminTicket, updateTicketStatus } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './SupportTicketsPage.module.css';

const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatShortDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function SupportTicketsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [detail, setDetail] = useState(null);       // { ticket, replies }
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminTickets({ status: statusFilter || undefined, category: categoryFilter || undefined, page, limit: 25 })
      .then(r => { setData(r.data.data); setTotal(r.data.total); setCounts(r.data.counts || {}); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (row) => {
    setDetailLoading(true);
    setDetail({ ticket: row, replies: [] });
    try {
      const { data } = await fetchAdminTicket(row.id);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!replyText.trim() || !detail?.ticket) return;
    setReplying(true);
    try {
      const { data: reply } = await replyAdminTicket(detail.ticket.id, { message: replyText.trim() });
      setDetail(prev => ({
        ...prev,
        ticket: { ...prev.ticket, status: prev.ticket.status === 'open' ? 'in_progress' : prev.ticket.status },
        replies: [...prev.replies, reply],
      }));
      setReplyText('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!detail?.ticket) return;
    try {
      await updateTicketStatus(detail.ticket.id, { status: newStatus });
      setDetail(prev => ({ ...prev, ticket: { ...prev.ticket, status: newStatus } }));
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const columns = [
    { key: 'id', label: '#', render: r => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{r.id}</span> },
    { key: 'subject', label: 'Subject', render: r => (
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.subject}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.workspace_name}</div>
      </div>
    )},
    { key: 'user', label: 'User', render: r => (
      <div style={{ fontSize: 12 }}>
        <div>{r.user_name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.user_email}</div>
      </div>
    )},
    { key: 'category', label: 'Category', render: r => (
      <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{r.category?.replace(/_/g, ' ')}</span>
    )},
    { key: 'priority', label: 'Priority', render: r => <StatusBadge status={r.priority} small /> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} small /> },
    { key: 'created_at', label: 'Created', render: r => <span style={{ fontSize: 12 }}>{formatShortDate(r.created_at)}</span> },
  ];

  const totalOpen = (counts.open || 0) + (counts.in_progress || 0);

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>
          Support Tickets
          {totalOpen > 0 && <span className={styles.openCount}>{totalOpen}</span>}
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
        emptyText={loading ? 'Loading...' : 'No tickets found'}
        toolbar={<>
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className={tableStyles.filterSelect} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="billing">Billing</option>
            <option value="general">General</option>
          </select>
        </>}
      />

      {/* Ticket Detail Modal */}
      {detail && (
        <div className={styles.overlay} onClick={closeDetail}>
          <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.detailHeader}>
              <div style={{ flex: 1 }}>
                <div className={styles.detailTitle}>#{detail.ticket.id} — {detail.ticket.subject}</div>
                <div className={styles.detailMeta}>
                  {detail.ticket.user_name} ({detail.ticket.user_email}) · {detail.ticket.workspace_name} · {formatDate(detail.ticket.created_at)}
                </div>
              </div>
              <button className={styles.closeBtn} onClick={closeDetail}>✕</button>
            </div>

            {/* Status + category bar */}
            <div className={styles.detailBar}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={detail.ticket.status} />
                <StatusBadge status={detail.ticket.priority} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {detail.ticket.category?.replace(/_/g, ' ')}
                </span>
              </div>
              <select
                className={styles.statusSelect}
                value={detail.ticket.status}
                onChange={e => handleStatusChange(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Description */}
            <div className={styles.descriptionBox}>
              <div className={styles.descLabel}>Description</div>
              <div className={styles.descText}>{detail.ticket.description}</div>
            </div>

            {/* Replies */}
            <div className={styles.repliesSection}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
              ) : detail.replies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No replies yet</div>
              ) : (
                detail.replies.map(r => (
                  <div key={r.id} className={`${styles.reply} ${r.is_admin ? styles.replyAdmin : styles.replyUser}`}>
                    <div className={styles.replyHeader}>
                      <span className={styles.replyAuthor}>
                        {r.user_name || 'Unknown'}
                        {r.is_admin ? <span className={styles.adminTag}>Admin</span> : ''}
                      </span>
                      <span className={styles.replyTime}>{formatDate(r.created_at)}</span>
                    </div>
                    <div className={styles.replyMessage}>{r.message}</div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            {detail.ticket.status !== 'closed' && (
              <div className={styles.replyBox}>
                <textarea
                  className={styles.replyInput}
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={3}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button
                    className={styles.sendBtn}
                    onClick={handleReply}
                    disabled={replying || !replyText.trim()}
                  >
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
