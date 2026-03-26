import { useState, useEffect, useCallback } from 'react';
import { fetchTransactions, fetchTransactionInvoice, exportTransactionsCSV } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './TransactionsPage.module.css';

function openInvoicePrint(inv) {
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to view the invoice.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number || ''}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;margin:0;padding:32px;color:#1a1a1a;font-size:13px}
  .header{display:flex;justify-content:space-between;margin-bottom:32px}
  .title{font-size:22px;font-weight:700;color:#111}
  .meta{text-align:right;font-size:12px;color:#555}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .box{border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-size:12px;line-height:1.8}
  .box-label{font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:10px;color:#888;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{text-align:left;font-size:11px;text-transform:uppercase;color:#888;padding:8px 10px;border-bottom:2px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
  .total-row td{font-weight:700;font-size:14px;border-top:2px solid #111;border-bottom:none}
  .footer{text-align:center;margin-top:32px;font-size:11px;color:#888}
  @media print{body{padding:20px}button{display:none!important}}
</style></head><body>
<div class="header"><div><div class="title">${inv.company_name || 'BrandDesk'}</div>
<div style="font-size:12px;color:#555;margin-top:4px">${inv.company_address || ''}</div>
${inv.gst_number ? `<div style="font-size:12px;color:#555">GSTIN: ${inv.gst_number}</div>` : ''}</div>
<div class="meta"><div style="font-size:18px;font-weight:700;color:#111">TAX INVOICE</div>
<div>Invoice: <strong>${inv.invoice_number || 'N/A'}</strong></div>
<div>Date: ${new Date(inv.created_at).toLocaleDateString('en-IN', { day:'2-digit',month:'short',year:'numeric' })}</div>
${inv.payu_mihpayid ? `<div>PayU Ref: ${inv.payu_mihpayid}</div>` : ''}</div></div>
<div class="grid"><div class="box"><div class="box-label">Bill To</div>
<div style="font-weight:600">${inv.workspace_name || 'Customer'}</div>
${inv.customer_gst ? `<div>GSTIN: ${inv.customer_gst}</div>` : ''}</div>
<div class="box"><div class="box-label">Payment Details</div>
<div>Method: ${inv.payment_method || 'N/A'}</div>
<div>Status: ${inv.status}</div>
<div>Txn ID: ${inv.txn_id}</div></div></div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
<tr><td>${inv.plan_name || 'Subscription'} — ${inv.billing_cycle || ''}</td><td style="text-align:right">₹${parseFloat(inv.base_amount || inv.amount).toLocaleString('en-IN')}</td></tr>
${inv.coupon_code ? `<tr><td>Coupon Discount (${inv.coupon_code})</td><td style="text-align:right;color:#16a34a">- ₹${parseFloat(inv.coupon_discount || 0).toLocaleString('en-IN')}</td></tr>` : ''}
${parseFloat(inv.gst_amount) > 0 ? `<tr><td>GST (${inv.gst_percent || 18}%)</td><td style="text-align:right">₹${parseFloat(inv.gst_amount).toLocaleString('en-IN')}</td></tr>` : ''}
<tr class="total-row"><td>Total</td><td style="text-align:right">₹${parseFloat(inv.amount).toLocaleString('en-IN')}</td></tr>
</tbody></table>
<div class="footer">Thank you for your business!<br>This is a computer-generated invoice.</div>
<div style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:10px 24px;border:none;border-radius:6px;background:#4f46e5;color:#fff;font-size:13px;cursor:pointer">Print / Download PDF</button></div>
</body></html>`);
  w.document.close();
}

export default function TransactionsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchTransactions({ status: statusFilter || undefined, page, limit: 50 })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleInvoice = async (txnId) => {
    try {
      const { data: inv } = await fetchTransactionInvoice(txnId);
      openInvoicePrint(inv);
    } catch (err) {
      alert('Failed to load invoice');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await exportTransactionsCSV({ status: statusFilter || undefined });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: r => r.invoice_number ? <code style={{ fontSize: 11 }}>{r.invoice_number}</code> : '—' },
    { key: 'txn_id', label: 'Txn ID', render: r => <code style={{ fontSize: 11 }}>{r.txn_id}</code> },
    { key: 'workspace_name', label: 'Workspace', render: r => <span style={{ fontWeight: 500 }}>{r.workspace_name || `WS #${r.workspace_id}`}</span> },
    { key: 'base_amount', label: 'Base', render: r => r.base_amount ? `₹${parseFloat(r.base_amount).toLocaleString('en-IN')}` : '—' },
    { key: 'coupon_code', label: 'Coupon', render: r => r.coupon_code ? <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>{r.coupon_code} (-₹{parseFloat(r.coupon_discount || 0).toLocaleString('en-IN')})</span> : '—' },
    { key: 'gst_amount', label: 'GST', render: r => r.gst_amount ? `₹${parseFloat(r.gst_amount).toLocaleString('en-IN')}` : '—' },
    { key: 'amount', label: 'Total', render: r => <strong>₹{parseFloat(r.amount).toLocaleString('en-IN')}</strong> },
    { key: 'customer_gst', label: 'Cust GST', render: r => r.customer_gst ? <code style={{ fontSize: 10 }}>{r.customer_gst}</code> : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'payu_mihpayid', label: 'PayU ID', render: r => r.payu_mihpayid ? <code style={{ fontSize: 11 }}>{r.payu_mihpayid}</code> : '—' },
    { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'actions', label: '', render: r => r.status === 'success' ? (
      <button className={tableStyles.actionBtn} onClick={() => handleInvoice(r.txn_id)}>Invoice</button>
    ) : null },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Transactions</h1>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          style={{ padding: '8px 18px', border: 'none', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>
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
