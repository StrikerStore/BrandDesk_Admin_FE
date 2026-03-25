import { useState, useEffect, useCallback } from 'react';
import { fetchTransactions } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './TransactionsPage.module.css';

export default function TransactionsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchTransactions({ status: statusFilter || undefined, page, limit: 50 })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'txn_id', label: 'Txn ID', render: r => <code style={{ fontSize: 11 }}>{r.txn_id}</code> },
    { key: 'workspace_name', label: 'Workspace', render: r => <span style={{ fontWeight: 500 }}>{r.workspace_name || `WS #${r.workspace_id}`}</span> },
    { key: 'amount', label: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString('en-IN')}` },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'payment_method', label: 'Method', render: r => r.payment_method || '—' },
    { key: 'payu_mihpayid', label: 'PayU ID', render: r => r.payu_mihpayid ? <code style={{ fontSize: 11 }}>{r.payu_mihpayid}</code> : '—' },
    { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
  ];

  return (
    <div>
      <h1 className={styles.pageTitle}>Transactions</h1>
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={50}
        onPageChange={setPage}
        emptyText={loading ? 'Loading...' : 'No transactions found'}
        toolbar={
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="pending">Pending</option>
          </select>
        }
      />
    </div>
  );
}
