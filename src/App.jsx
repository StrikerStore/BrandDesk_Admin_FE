import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchCurrentUser } from './utils/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage';
import UsersPage from './pages/UsersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import TransactionsPage from './pages/TransactionsPage';
import CouponsPage from './pages/CouponsPage';
import PlansPage from './pages/PlansPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import DemoRequestsPage from './pages/DemoRequestsPage';

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('bd_admin_token', token);
      window.history.replaceState({}, '', '/');
    }

    const stored = localStorage.getItem('bd_admin_token');
    if (!stored) { setLoading(false); return; }

    fetchCurrentUser()
      .then(({ data }) => {
        if (data.role !== 'admin') {
          console.error('[ADMIN] User role is not admin:', data.role);
          localStorage.removeItem('bd_admin_token');
          return;
        }
        setUser(data);
      })
      .catch((err) => {
        console.error('[ADMIN] fetchCurrentUser failed:', err.response?.status, err.response?.data || err.message);
        localStorage.removeItem('bd_admin_token');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />
        } />
        <Route path="/*" element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={() => { localStorage.removeItem('bd_admin_token'); setUser(null); }}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/support" element={<SupportTicketsPage />} />
                <Route path="/demos" element={<DemoRequestsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
