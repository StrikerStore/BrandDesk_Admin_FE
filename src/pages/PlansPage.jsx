import { useState, useEffect, useCallback } from 'react';
import { fetchPlans, createPlan, updatePlan, deletePlan } from '../utils/api';
import DataTable, { tableStyles } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import styles from './PlansPage.module.css';

const EMPTY_FORM = {
  name: '',
  display_name: '',
  description: '',
  sort_order: 0,
  max_brands: '',
  max_members: '',
  max_threads_per_month: '',
  max_templates: '',
  price_monthly: '',
  price_yearly: '',
};

export default function PlansPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchPlans()
      .then(r => setData(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (e, plan) => {
    e.stopPropagation();
    setEditingId(plan.id);
    setForm({
      name: plan.name || '',
      display_name: plan.display_name || '',
      description: plan.description || '',
      sort_order: plan.sort_order ?? 0,
      max_brands: plan.max_brands ?? '',
      max_members: plan.max_members ?? '',
      max_threads_per_month: plan.max_threads_per_month ?? '',
      max_templates: plan.max_templates ?? '',
      price_monthly: plan.price_monthly || '',
      price_yearly: plan.price_yearly || '',
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
        name: form.name.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        description: form.description.trim() || null,
        sort_order: parseInt(form.sort_order) || 0,
        max_brands: form.max_brands === '' ? null : parseInt(form.max_brands),
        max_members: form.max_members === '' ? null : parseInt(form.max_members),
        max_threads_per_month: form.max_threads_per_month === '' ? null : parseInt(form.max_threads_per_month),
        max_templates: form.max_templates === '' ? null : parseInt(form.max_templates),
        price_monthly: parseInt(form.price_monthly) || 0,
        price_yearly: parseInt(form.price_yearly) || 0,
      };
      if (editingId) {
        const { name, ...updateData } = payload; // Don't update name
        await updatePlan(editingId, updateData);
      } else {
        await createPlan(payload);
      }
      closeModal();
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (e, plan) => {
    e.stopPropagation();
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update plan');
    }
  };

  const handleDelete = async (e, plan) => {
    e.stopPropagation();
    if (!confirm(`Delete plan "${plan.display_name}"? This cannot be undone.`)) return;
    try {
      await deletePlan(plan.id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  const formatLimit = (val) => val === null || val === undefined ? '∞' : val.toLocaleString('en-IN');
  const formatPrice = (val) => val ? `₹${val.toLocaleString('en-IN')}` : '—';

  const columns = [
    { key: 'sort_order', label: '#', render: r => <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.sort_order}</span> },
    { key: 'display_name', label: 'Plan', render: r => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.display_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.name}</div>
      </div>
    )},
    { key: 'description', label: 'Description', render: r => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description || '—'}</span> },
    { key: 'limits', label: 'Limits', render: r => (
      <div style={{ fontSize: 11, lineHeight: 1.7 }}>
        <div>Brands: <strong>{formatLimit(r.max_brands)}</strong></div>
        <div>Members: <strong>{formatLimit(r.max_members)}</strong></div>
        <div>Threads/mo: <strong>{formatLimit(r.max_threads_per_month)}</strong></div>
        <div>Templates: <strong>{formatLimit(r.max_templates)}</strong></div>
      </div>
    )},
    { key: 'pricing', label: 'Pricing', render: r => (
      <div style={{ fontSize: 12 }}>
        <div>{formatPrice(r.price_monthly)}<span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/mo</span></div>
        <div>{formatPrice(r.price_yearly)}<span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/yr</span></div>
      </div>
    )},
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
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Plans</h1>
        <button className={styles.createBtn} onClick={openCreate}>+ Create Plan</button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={data.length}
        page={1}
        limit={100}
        onPageChange={() => {}}
        emptyText={loading ? 'Loading...' : 'No plans found'}
      />

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editingId ? 'Edit Plan' : 'Create Plan'}</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Internal Name</label>
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="e.g. starter"
                  disabled={!!editingId}
                  style={editingId ? { opacity: 0.6 } : {}}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Display Name</label>
                <input
                  className={styles.formInput}
                  value={form.display_name}
                  onChange={e => handleChange('display_name', e.target.value)}
                  placeholder="e.g. Starter"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <input
                className={styles.formInput}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="e.g. 3 brands · 3 members · 1K threads/mo"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sort Order</label>
              <input
                className={styles.formInput}
                type="number"
                value={form.sort_order}
                onChange={e => handleChange('sort_order', e.target.value)}
                style={{ width: 80 }}
              />
            </div>

            <div className={styles.sectionLabel}>Limits <span className={styles.hint}>(leave blank for unlimited)</span></div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Brands</label>
                <input className={styles.formInput} type="number" min="0" value={form.max_brands} onChange={e => handleChange('max_brands', e.target.value)} placeholder="∞" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Members</label>
                <input className={styles.formInput} type="number" min="0" value={form.max_members} onChange={e => handleChange('max_members', e.target.value)} placeholder="∞" />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Threads / Month</label>
                <input className={styles.formInput} type="number" min="0" value={form.max_threads_per_month} onChange={e => handleChange('max_threads_per_month', e.target.value)} placeholder="∞" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Templates</label>
                <input className={styles.formInput} type="number" min="0" value={form.max_templates} onChange={e => handleChange('max_templates', e.target.value)} placeholder="∞" />
              </div>
            </div>

            <div className={styles.sectionLabel}>Pricing <span className={styles.hint}>(in INR, 0 = free)</span></div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Monthly Price</label>
                <input className={styles.formInput} type="number" min="0" value={form.price_monthly} onChange={e => handleChange('price_monthly', e.target.value)} placeholder="0" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Yearly Price</label>
                <input className={styles.formInput} type="number" min="0" value={form.price_yearly} onChange={e => handleChange('price_yearly', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !form.display_name.trim() || (!editingId && !form.name.trim())}
              >
                {saving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
