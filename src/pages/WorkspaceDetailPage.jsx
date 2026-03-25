import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchWorkspaceDetail, suspendWorkspace, reactivateWorkspace,
  changeWorkspacePlan, triggerSync, resetGmail, resetShopify,
  updateBrandLabel, approveBrand, rejectBrand, deleteWorkspaceData, deleteBrandData, FRONTEND_URL,
} from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import styles from './WorkspaceDetailPage.module.css';

const BRAND_STATUS_STYLES = {
  draft:            { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
  pending_approval: { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  approved:         { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  rejected:         { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

const MODAL_OVERLAY = {
  position: 'fixed', inset: 0, zIndex: 999,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};
const MODAL_BOX = {
  background: 'var(--card-bg, #fff)', borderRadius: 12,
  width: 460, maxWidth: '92vw', padding: '28px 28px 24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};
const MODAL_TITLE = { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 };
const MODAL_LABEL = { fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' };
const MODAL_INPUT = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1px solid var(--border, #ddd)', borderRadius: 6,
  boxSizing: 'border-box', marginBottom: 12,
};
const MODAL_SELECT = { ...MODAL_INPUT, cursor: 'pointer' };
const MODAL_BTN = {
  padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer',
};
const MODAL_BTN_PRIMARY = { ...MODAL_BTN, background: 'var(--accent)', color: '#fff' };
const MODAL_BTN_CANCEL = { ...MODAL_BTN, background: 'transparent', border: '1px solid var(--border, #ddd)', color: 'var(--text)' };
const MODAL_BTN_DANGER = { ...MODAL_BTN, background: '#dc2626', color: '#fff' };
const MODAL_FOOTER = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 };

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brandLabels, setBrandLabels] = useState({});
  const [approvingBrand, setApprovingBrand] = useState(null);

  // Modal states
  const [deleteModal, setDeleteModal] = useState(null);
  const [planModal, setPlanModal] = useState(false);
  const [trialModal, setTrialModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);     // { title, message, onConfirm }
  const [labelModal, setLabelModal] = useState(null);         // { brand }
  const [rejectModal, setRejectModal] = useState(null);       // { brand }
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);             // { text, type: 'success'|'error' }

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const load = () => {
    setLoading(true);
    fetchWorkspaceDetail(id)
      .then(r => {
        setData(r.data);
        const labels = {};
        (r.data.brands || []).forEach(b => { if (b.label) labels[b.id] = b.label; });
        setBrandLabels(prev => ({ ...prev, ...labels }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Loading...</div>;
  if (!data) return <div style={{ color: 'var(--red)', padding: 20 }}>Workspace not found</div>;

  const { workspace: ws, members, brands, gmail, subscription } = data;
  const pendingBrands = brands.filter(b => ['draft', 'pending_approval'].includes(b.brand_status));
  const hasPendingBrands = pendingBrands.length > 0;

  const handleSuspend = () => {
    setConfirmModal({
      title: ws.is_active ? '⚠️ Suspend Workspace' : '✅ Reactivate Workspace',
      message: ws.is_active
        ? `Suspend "${ws.name}"? Users will lose access until reactivated.`
        : `Reactivate "${ws.name}"? Users will regain access immediately.`,
      btnLabel: ws.is_active ? 'Suspend' : 'Reactivate',
      danger: ws.is_active,
      onConfirm: async () => {
        await (ws.is_active ? suspendWorkspace(id) : reactivateWorkspace(id));
        load();
      },
    });
  };

  const handleSync = () => {
    setConfirmModal({
      title: '🔄 Trigger Full Sync',
      message: `This will trigger a full email sync for "${ws.name}". This may take a while.`,
      btnLabel: 'Trigger Sync',
      onConfirm: async () => {
        try {
          await triggerSync(id);
          showToast('Sync triggered successfully');
        } catch (err) {
          showToast(err.response?.data?.error || 'Sync failed', 'error');
        }
      },
    });
  };

  const handleResetGmail = () => {
    setConfirmModal({
      title: '⚠️ Reset Gmail Connection',
      message: `This will delete all Gmail tokens for "${ws.name}". The workspace will need to reconnect Gmail.`,
      btnLabel: 'Reset Gmail',
      danger: true,
      onConfirm: async () => { await resetGmail(id); load(); },
    });
  };

  const handleResetShopify = (brandId, brandName) => {
    setConfirmModal({
      title: '⚠️ Reset Shopify Connection',
      message: `Reset Shopify connection for "${brandName}"?`,
      btnLabel: 'Reset Shopify',
      danger: true,
      onConfirm: async () => { await resetShopify(brandId); load(); },
    });
  };

  const handleApproveBrand = async (brandId) => {
    const label = (brandLabels[brandId] || '').trim();
    if (!label) { showToast('Please enter a Gmail label before approving.', 'error'); return; }
    const brand = brands.find(b => b.id === brandId);
    setConfirmModal({
      title: '✅ Approve Brand',
      message: `Approve "${brand?.name}" with Gmail label "${label}"? This will activate the brand and trigger an initial sync.`,
      btnLabel: 'Approve',
      onConfirm: async () => {
        setApprovingBrand(brandId);
        try {
          await approveBrand(brandId, label);
          showToast(`"${brand?.name}" approved successfully`);
          load();
        } catch (err) {
          showToast(err.response?.data?.error || 'Approval failed', 'error');
        } finally {
          setApprovingBrand(null);
        }
      },
    });
  };

  const handleRejectBrand = async () => {
    if (!rejectReason.trim() || !rejectModal?.brand) return;
    setRejecting(true);
    try {
      await rejectBrand(rejectModal.brand.id, rejectReason.trim());
      showToast(`"${rejectModal.brand.name}" rejected`);
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleEditLabel = (brand) => {
    setLabelModal({ brand, value: brand.label || '' });
  };

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const renderBrandStatusBadge = (status) => {
    const s = BRAND_STATUS_STYLES[status] || BRAND_STATUS_STYLES.draft;
    return (
      <span style={{
        display: 'inline-block', fontSize: 10, fontWeight: 600,
        padding: '1px 7px', borderRadius: 99,
        background: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
        textTransform: 'capitalize', whiteSpace: 'nowrap',
      }}>
        {(status || 'unknown').replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div>
      <button className={styles.backBtn} onClick={() => navigate('/workspaces')}>← Back to Workspaces</button>

      <div className={styles.header}>
        <div>
          <div className={styles.title}>{ws.name}</div>
          <div className={styles.slug}>{ws.slug}</div>
        </div>
        <div className={styles.badges}>
          <StatusBadge status={ws.plan} />
          <StatusBadge status={ws.is_active ? 'active' : 'expired'} />
          {ws.onboarding_status && ws.onboarding_status !== 'approved' && (
            <StatusBadge status={ws.onboarding_status.replace(/_/g, ' ')} small />
          )}
        </div>
      </div>

      {/* Pending brand approval banner */}
      {hasPendingBrands && (
        <div style={{ padding: '16px 18px', marginBottom: 16, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 12 }}>
            ⏳ {pendingBrands.length} brand{pendingBrands.length > 1 ? 's' : ''} pending approval
          </div>
          {pendingBrands.map(b => (
            <div key={b.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', marginBottom: 8, background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #fde68a' }}>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.email}</div>
                {b.category && <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>{b.category}</div>}
                {b.website && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.website}</div>}
                {b.gmail_email && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gmail: {b.gmail_email}</div>}
              </div>
              <input
                placeholder="Gmail label (e.g. Shop/MyStore)"
                value={brandLabels[b.id] || ''}
                onChange={e => setBrandLabels(prev => ({ ...prev, [b.id]: e.target.value }))}
                style={{ flex: 1, minWidth: 160, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleApproveBrand(b.id)}
                  disabled={approvingBrand === b.id}
                  style={{ padding: '7px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: approvingBrand === b.id ? 0.7 : 1 }}
                >
                  {approvingBrand === b.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => { setRejectModal({ brand: b }); setRejectReason(''); }}
                  style={{ padding: '7px 14px', background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => setPlanModal(true)}>Change Plan</button>
        <button className={styles.actionBtn} onClick={() => setTrialModal(true)}>Extend Trial</button>
        <button className={styles.actionBtn} onClick={handleSync}>Trigger Sync</button>
        <button className={styles.actionBtn} onClick={handleResetGmail}>
          {gmail ? 'Reset Gmail' : 'Gmail not connected'}
        </button>
        <button className={`${styles.actionBtn} ${ws.is_active ? styles.actionBtnDanger : ''}`} onClick={handleSuspend}>
          {ws.is_active ? 'Suspend' : 'Reactivate'}
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={() => setDeleteModal({ type: 'workspace', id: ws.id, name: ws.name })}>
          🗑 Delete Workspace
        </button>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Owner</div>
          <div className={styles.infoValue}>{ws.owner_name || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ws.owner_email}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Created</div>
          <div className={styles.infoValue}>{formatDate(ws.created_at)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Trial Ends</div>
          <div className={styles.infoValue}>{formatDate(ws.trial_ends_at)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Gmail</div>
          <div className={styles.infoValue}>{gmail?.email || 'Not connected'}</div>
        </div>
        {subscription && (
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Subscription</div>
            <div className={styles.infoValue}>
              <StatusBadge status={subscription.status} small /> {subscription.plan} / {subscription.billing_cycle}
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Members ({members.length})</div>
        <div className={styles.card}>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{m.email}</td>
                  <td><StatusBadge status={m.role} small /></td>
                  <td>{formatDate(m.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brands */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Brands ({brands.length})</div>
        <div className={styles.card}>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Label</th><th>Status</th><th>Gmail</th><th>Shopify</th><th>Sync</th><th></th></tr></thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    {b.category && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.category}</div>}
                    {b.website && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.website}</div>}
                  </td>
                  <td>{b.email}</td>
                  <td>
                    <code style={{ fontSize: 11 }}>{b.label || '—'}</code>
                    <button
                      onClick={() => handleEditLabel(b)}
                      style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >Edit</button>
                  </td>
                  <td>{renderBrandStatusBadge(b.brand_status || 'approved')}</td>
                  <td style={{ fontSize: 12 }}>{b.gmail_email || '—'}</td>
                  <td>
                    {b.shopify_connected
                      ? <StatusBadge status="active" small />
                      : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.shopify_store || 'Not set'}</span>}
                  </td>
                  <td>
                    {b.initial_sync_done === 0
                      ? <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>⏳ Pending</span>
                      : <span style={{ fontSize: 10, color: '#166534', fontWeight: 600 }}>✓ Done</span>}
                  </td>
                  <td>
                    {b.shopify_connected && (
                      <button style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => handleResetShopify(b.id, b.name)}>Reset Shopify</button>
                    )}
                    <button style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}
                      onClick={() => setDeleteModal({ type: 'brand', id: b.id, name: b.name })}>🗑 Delete</button>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && <tr><td colSpan={8} style={{ color: 'var(--text-muted)' }}>No brands</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          background: toastMsg.type === 'error' ? '#dc2626' : '#16a34a',
          animation: 'fadeIn 0.2s',
        }}>
          {toastMsg.type === 'error' ? '❌ ' : '✅ '}{toastMsg.text}
        </div>
      )}

      {/* ── Modals ── */}

      {planModal && (
        <ChangePlanModal
          currentPlan={ws.plan}
          currentCycle={subscription?.billing_cycle}
          trialEnds={ws.trial_ends_at}
          onClose={() => setPlanModal(false)}
          onSave={async (planData) => {
            await changeWorkspacePlan(id, planData);
            setPlanModal(false);
            showToast('Plan updated successfully');
            load();
          }}
        />
      )}

      {trialModal && (
        <ExtendTrialModal
          currentTrialEnd={ws.trial_ends_at}
          onClose={() => setTrialModal(false)}
          onSave={async (trialData) => {
            await changeWorkspacePlan(id, trialData);
            setTrialModal(false);
            showToast('Trial extended successfully');
            load();
          }}
        />
      )}

      {confirmModal && (
        <ConfirmActionModal {...confirmModal} onClose={() => setConfirmModal(null)} />
      )}

      {labelModal && (
        <EditLabelModal
          brand={labelModal.brand}
          initialValue={labelModal.value}
          onClose={() => setLabelModal(null)}
          onSave={async (label) => {
            try {
              await updateBrandLabel(labelModal.brand.id, label);
              setLabelModal(null);
              showToast('Label updated');
              load();
            } catch (err) {
              showToast(err.response?.data?.error || 'Failed to update label', 'error');
            }
          }}
        />
      )}

      {rejectModal && (
        <div style={MODAL_OVERLAY} onClick={() => setRejectModal(null)}>
          <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
            <div style={MODAL_TITLE}>Reject "{rejectModal.brand.name}"</div>
            <label style={MODAL_LABEL}>Rejection Reason *</label>
            <textarea
              style={{ ...MODAL_INPUT, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Explain why this brand request is being rejected…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 12 }}>
              This reason will be shown to the user on their onboarding page.
            </div>
            <div style={MODAL_FOOTER}>
              <button style={MODAL_BTN_CANCEL} onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                style={{ ...MODAL_BTN_DANGER, opacity: rejecting || !rejectReason.trim() ? 0.5 : 1 }}
                onClick={handleRejectBrand}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? 'Rejecting...' : 'Reject Brand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <ConfirmDeleteModal
          type={deleteModal.type}
          name={deleteModal.name}
          onClose={() => setDeleteModal(null)}
          onConfirm={async (confirmText) => {
            if (deleteModal.type === 'workspace') {
              await deleteWorkspaceData(deleteModal.id, confirmText);
              navigate('/workspaces');
            } else {
              await deleteBrandData(deleteModal.id, confirmText);
              setDeleteModal(null);
              load();
            }
          }}
        />
      )}
    </div>
  );
}

/* ─── Change Plan Modal ─── */
function ChangePlanModal({ currentPlan, currentCycle, trialEnds, onClose, onSave }) {
  const [plan, setPlan] = useState(currentPlan || 'trial');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({ plan });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update plan.');
      setSaving(false);
    }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onClose}>
      <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
        <div style={MODAL_TITLE}>Change Workspace Plan</div>

        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg, #f9fafb)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <div>Current plan: <strong style={{ textTransform: 'capitalize' }}>{currentPlan}</strong></div>
          {currentCycle && <div>Billing cycle: <strong style={{ textTransform: 'capitalize' }}>{currentCycle}</strong></div>}
          {trialEnds && <div>Trial ends: <strong>{new Date(trialEnds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>}
        </div>

        <label style={MODAL_LABEL}>New Plan</label>
        <select style={MODAL_SELECT} value={plan} onChange={e => setPlan(e.target.value)}>
          <option value="trial">Trial (Free)</option>
          <option value="starter">Starter — ₹999/mo or ₹9,999/yr</option>
          <option value="pro">Pro — ₹2,499/mo or ₹24,999/yr</option>
        </select>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          {plan === 'trial' && '3 brands · 3 members · Limited threads. Trial period applies.'}
          {plan === 'starter' && '3 brands · 3 members · 1,000 threads/mo. Ideal for small teams.'}
          {plan === 'pro' && 'Unlimited brands · Unlimited members · Unlimited threads. Priority support.'}
        </div>

        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

        <div style={MODAL_FOOTER}>
          <button style={MODAL_BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button style={{ ...MODAL_BTN_PRIMARY, opacity: saving || plan === currentPlan ? 0.6 : 1 }}
            onClick={handleSave} disabled={saving || plan === currentPlan}>
            {saving ? 'Saving...' : 'Update Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Extend Trial Modal ─── */
function ExtendTrialModal({ currentTrialEnd, onClose, onSave }) {
  const [days, setDays] = useState('14');
  const [customDate, setCustomDate] = useState('');
  const [mode, setMode] = useState('days'); // 'days' | 'date'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const computedDate = mode === 'days'
    ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(days || '0')); return d; })()
    : (customDate ? new Date(customDate) : null);

  const handleSave = async () => {
    if (!computedDate || isNaN(computedDate.getTime())) {
      setError('Please enter a valid date or number of days.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({ trial_ends_at: computedDate.toISOString().slice(0, 19).replace('T', ' ') });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extend trial.');
      setSaving(false);
    }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onClose}>
      <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
        <div style={MODAL_TITLE}>Extend Trial Period</div>

        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg, #f9fafb)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Current trial ends: <strong>{currentTrialEnd ? new Date(currentTrialEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</strong>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--bg, #f3f4f6)', borderRadius: 6, padding: 3, width: 'fit-content' }}>
          <button onClick={() => setMode('days')} style={{
            padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: mode === 'days' ? 'var(--card-bg, #fff)' : 'transparent',
            color: mode === 'days' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: mode === 'days' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>By Days</button>
          <button onClick={() => setMode('date')} style={{
            padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: mode === 'date' ? 'var(--card-bg, #fff)' : 'transparent',
            color: mode === 'date' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: mode === 'date' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>Specific Date</button>
        </div>

        {mode === 'days' ? (
          <>
            <label style={MODAL_LABEL}>Extend by (days from today)</label>
            <input type="number" min="1" max="365" value={days} onChange={e => setDays(e.target.value)}
              style={MODAL_INPUT} autoFocus />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[7, 14, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDays(String(d))} style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontWeight: 500,
                  border: `1px solid ${String(d) === days ? 'var(--accent)' : 'var(--border, #ddd)'}`,
                  background: String(d) === days ? 'var(--accent-light, #eef2ff)' : 'transparent',
                  color: String(d) === days ? 'var(--accent)' : 'var(--text-muted)',
                }}>{d}d</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <label style={MODAL_LABEL}>New trial end date</label>
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              style={MODAL_INPUT} autoFocus />
          </>
        )}

        {computedDate && !isNaN(computedDate.getTime()) && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            New trial end: <strong>{computedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

        <div style={MODAL_FOOTER}>
          <button style={MODAL_BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button style={{ ...MODAL_BTN_PRIMARY, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Extend Trial'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Action Modal (replaces confirm/alert) ─── */
function ConfirmActionModal({ title, message, btnLabel = 'Confirm', danger, onConfirm, onClose }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    setRunning(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed.');
      setRunning(false);
    }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onClose}>
      <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
        <div style={{ ...MODAL_TITLE, color: danger ? '#dc2626' : 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>{message}</div>
        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}
        <div style={MODAL_FOOTER}>
          <button style={MODAL_BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button style={{ ...(danger ? MODAL_BTN_DANGER : MODAL_BTN_PRIMARY), opacity: running ? 0.6 : 1 }}
            onClick={handleConfirm} disabled={running}>
            {running ? 'Processing...' : btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Label Modal ─── */
function EditLabelModal({ brand, initialValue, onClose, onSave }) {
  const [label, setLabel] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try { await onSave(label.trim()); } catch { setSaving(false); }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onClose}>
      <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
        <div style={MODAL_TITLE}>Edit Gmail Label — {brand.name}</div>
        <label style={MODAL_LABEL}>Gmail Label</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Shop/MyStore"
          style={MODAL_INPUT} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
        <div style={MODAL_FOOTER}>
          <button style={MODAL_BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button style={{ ...MODAL_BTN_PRIMARY, opacity: saving || !label.trim() ? 0.6 : 1 }}
            onClick={handleSave} disabled={saving || !label.trim()}>
            {saving ? 'Saving...' : 'Update Label'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Delete Modal ─── */
function ConfirmDeleteModal({ type, name, onClose, onConfirm }) {
  const [input, setInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const expectedText = `DELETE ${name}`;
  const isMatch = input === expectedText;

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try { await onConfirm(input); } catch (err) {
      setError(err.response?.data?.error || 'Deletion failed.');
      setDeleting(false);
    }
  };

  return (
    <div style={MODAL_OVERLAY} onClick={onClose}>
      <div style={MODAL_BOX} onClick={e => e.stopPropagation()}>
        <div style={{ ...MODAL_TITLE, color: '#dc2626' }}>
          ⚠️ Delete {type === 'workspace' ? 'Workspace' : 'Brand'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          This will <strong style={{ color: '#dc2626' }}>permanently delete</strong> all data for <strong>{name}</strong>
          {type === 'workspace'
            ? ' including all brands, threads, messages, customers, templates, settings, and billing data. User accounts will be preserved.'
            : ' including all associated threads, messages, and attachments.'}
          <br /><br /><strong>This action cannot be undone.</strong>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Type <code style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{expectedText}</code> to confirm:
        </div>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={expectedText} autoFocus
          style={{ ...MODAL_INPUT, fontFamily: 'monospace', fontSize: 14, border: `2px solid ${isMatch ? '#dc2626' : 'var(--border, #ddd)'}` }} />
        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}
        <div style={MODAL_FOOTER}>
          <button style={MODAL_BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button onClick={handleDelete} disabled={!isMatch || deleting}
            style={{ ...MODAL_BTN, fontWeight: 700, background: isMatch ? '#dc2626' : '#f3f4f6', color: isMatch ? '#fff' : '#9ca3af', cursor: isMatch ? 'pointer' : 'not-allowed', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? 'Deleting...' : `Delete ${type === 'workspace' ? 'Workspace' : 'Brand'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
