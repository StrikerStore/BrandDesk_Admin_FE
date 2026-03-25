import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Use separate token key so admin can also be logged into main app
api.interceptors.request.use(config => {
  const token = localStorage.getItem('bd_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──
export const getGoogleSigninUrl = () =>
  `${API_URL}/auth/google/signin?intent=login&redirect=admin`;
export const fetchCurrentUser = () => api.get('/api/users/me');

// ── Dashboard ──
export const fetchDashboard = () => api.get('/api/admin/dashboard');

// ── Workspaces ──
export const fetchWorkspaces     = (params) => api.get('/api/admin/workspaces', { params });
export const fetchWorkspaceDetail = (id)    => api.get(`/api/admin/workspaces/${id}`);
export const suspendWorkspace    = (id)     => api.patch(`/api/admin/workspaces/${id}/suspend`);
export const reactivateWorkspace = (id)     => api.patch(`/api/admin/workspaces/${id}/reactivate`);
export const changeWorkspacePlan = (id, d)  => api.patch(`/api/admin/workspaces/${id}/plan`, d);

// ── Users ──
export const fetchUsers       = (params) => api.get('/api/admin/users', { params });
export const deactivateUser   = (id)     => api.patch(`/api/admin/users/${id}/deactivate`);
export const reactivateUser   = (id)     => api.patch(`/api/admin/users/${id}/reactivate`);

// ── Subscriptions ──
export const fetchSubscriptions = (params) => api.get('/api/admin/subscriptions', { params });
export const extendTrial        = (id, d)  => api.patch(`/api/admin/subscriptions/${id}/extend-trial`, d);
export const changePlan         = (id, d)  => api.patch(`/api/admin/subscriptions/${id}/change-plan`, d);
export const cancelSubscription = (id)     => api.patch(`/api/admin/subscriptions/${id}/cancel`);

// ── Transactions ──
export const fetchTransactions = (params) => api.get('/api/admin/transactions', { params });

// ── Coupons ──
export const fetchCoupons  = (params)   => api.get('/api/admin/coupons', { params });
export const createCoupon  = (data)     => api.post('/api/admin/coupons', data);
export const updateCoupon  = (id, data) => api.patch(`/api/admin/coupons/${id}`, data);
export const deleteCoupon  = (id)       => api.delete(`/api/admin/coupons/${id}`);

// ── Plans ──
export const fetchPlans  = ()         => api.get('/api/admin/plans');
export const createPlan  = (data)     => api.post('/api/admin/plans', data);
export const updatePlan  = (id, data) => api.patch(`/api/admin/plans/${id}`, data);
export const deletePlan  = (id)       => api.delete(`/api/admin/plans/${id}`);

// ── Demo Requests ──
export const fetchDemoRequests    = (params)   => api.get('/api/admin/demo-requests', { params });
export const updateDemoStatus     = (id, data) => api.patch(`/api/admin/demo-requests/${id}/status`, data);

// ── Support Tickets ──
export const fetchAdminTickets   = (params)   => api.get('/api/admin/support/tickets', { params });
export const fetchAdminTicket    = (id)       => api.get(`/api/admin/support/tickets/${id}`);
export const replyAdminTicket    = (id, data) => api.post(`/api/admin/support/tickets/${id}/reply`, data);
export const updateTicketStatus  = (id, data) => api.patch(`/api/admin/support/tickets/${id}/status`, data);

// ── Support Tools ──
export const impersonateUser    = (userId) => api.post(`/api/admin/impersonate/${userId}`);
export const triggerSync        = (wsId)   => api.post(`/api/admin/workspaces/${wsId}/sync`);
export const resetGmail         = (wsId)   => api.post(`/api/admin/workspaces/${wsId}/reset-gmail`);
export const resetShopify       = (brandId)=> api.post(`/api/admin/brands/${brandId}/reset-shopify`);
export const updateBrandLabel   = (brandId, label) => api.patch(`/api/admin/brands/${brandId}/label`, { label });
export const approveBrand       = (brandId, label) => api.patch(`/api/admin/brands/${brandId}/approve`, { label });
export const rejectBrand        = (brandId, reason) => api.patch(`/api/admin/brands/${brandId}/reject`, { reason });

// ── Destructive Data Deletion ──
export const deleteWorkspaceData = (wsId, confirmText)    => api.post(`/api/admin/workspaces/${wsId}/delete-data`, { confirm_text: confirmText });
export const deleteBrandData     = (brandId, confirmText) => api.post(`/api/admin/brands/${brandId}/delete-data`, { confirm_text: confirmText });

export { API_URL, FRONTEND_URL };
export default api;
