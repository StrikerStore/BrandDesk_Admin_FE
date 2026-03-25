import { useState, useEffect, useCallback } from 'react';
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './CouponsPage.module.css';

const EMPTY_FORM = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_plan: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
};

export default function CouponsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchCoupons({ search: search || undefined, status: statusFilter || undefined, page, limit: 25 })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const toInputDate = d => d ? new Date(d).toISOString().split('T')[0] : '';

  // ── Modal helpers ──
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (e, coupon) => {
    e.stopPropagation();
    setEditingId(coupon.id);
    setForm({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percent',
      discount_value: coupon.discount_value ?? '',
      min_plan: coupon.min_plan || '',
      max_uses: coupon.max_uses ?? '',
      valid_from: toInputDate(coupon.valid_from),
      valid_until: toInputDate(coupon.valid_until),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_plan: form.min_plan || null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      };
      if (editingId) {
        await updateCoupon(editingId, payload);
      } else {
        await createCoupon(payload);
      }
      closeModal();
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  // ── Row actions ──
  const handleToggleActive = async (e, coupon) => {
    e.stopPropagation();
    const newStatus = coupon.is_active ? false : true;
    try {
      await updateCoupon(coupon.id, { is_active: newStatus });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update coupon');
    }
  };

  const handleDelete = async (e, coupon) => {
    e.stopPropagation();
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      await deleteCoupon(coupon.id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const columns = [
    { key: 'code', label: 'Code', render: r => <code style={{ fontSize: 12, fontWeight: 700 }}>{r.code}</code> },
    { key: 'discount_type', label: 'Type', render: r => <span style={{ textTransform: 'capitalize' }}>{r.discount_type}</span> },
    { key: 'discount_value', label: 'Value', render: r => r.discount_type === 'percent' ? `${r.discount_value}%` : `₹${parseFloat(r.discount_value).toLocaleString('en-IN')}` },
    { key: 'min_plan', label: 'Min Plan', render: r => r.min_plan ? <StatusBadge status={r.min_plan} small /> : '—' },
    { key: 'usage', label: 'Usage', render: r => `${r.times_used || 0}${r.max_uses ? ` / ${r.max_uses}` : ''}` },
    { key: 'valid_from', label: 'Valid From', render: r => formatDate(r.valid_from) },
    { key: 'valid_until', label: 'Valid Until', render: r => formatDate(r.valid_until) },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.is_active ? 'active' : 'inactive'} small /> },
    { key: 'actions', label: '', render: r => (
      <div className={tableStyles.actions}>
        <button className={tableStyles.actionBtn} onClick={e => openEdit(e, r)}>Edit</button>
        <button className={tableStyles.actionBtn} onClick={e => handleToggleActive(e, r)}>
          {r.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button className={`${tableStyles.actionBtn} ${tableStyles.actionBtnDanger}`} onClick={e => handleDelete(e, r)}>Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Coupons</h1>
        <button className={styles.createBtn} onClick={openCreate}>+ Create Coupon</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={25}
        onPageChange={setPage}
        emptyText={loading ? 'Loading...' : 'No coupons found'}
        toolbar={<>
          <input
            className={tableStyles.searchInput}
            placeholder="Search by code..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className={tableStyles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>}
      />

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Code</label>
              <input
                className={styles.formInput}
                value={form.code}
                onChange={e => handleChange('code', e.target.value)}
                placeholder="e.g. WELCOME20"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Discount Type</label>
                <select
                  className={styles.formSelect}
                  value={form.discount_type}
                  onChange={e => handleChange('discount_type', e.target.value)}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Discount Value</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0"
                  value={form.discount_value}
                  onChange={e => handleChange('discount_value', e.target.value)}
                  placeholder={form.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Min Plan (optional)</label>
                <select
                  className={styles.formSelect}
                  value={form.min_plan}
                  onChange={e => handleChange('min_plan', e.target.value)}
                >
                  <option value="">Any plan</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Uses (optional)</label>
                <input
                  className={styles.formInput}
                  type="number"
                  min="0"
                  value={form.max_uses}
                  onChange={e => handleChange('max_uses', e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Valid From (optional)</label>
                <input
                  className={styles.formInput}
                  type="date"
                  value={form.valid_from}
                  onChange={e => handleChange('valid_from', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Valid Until (optional)</label>
                <input
                  className={styles.formInput}
                  type="date"
                  value={form.valid_until}
                  onChange={e => handleChange('valid_until', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !form.code.trim() || !form.discount_value}
              >
                {saving ? 'Saving...' : editingId ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
