import { useState, useEffect } from 'react';
import { fetchDashboard } from '../utils/api';
import StatsCard from '../components/StatsCard';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Loading dashboard...</div>;
  if (!data) return <div style={{ color: 'var(--red)', padding: 20 }}>Failed to load dashboard</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <StatsCard label="Total Workspaces" value={data.totalWorkspaces} sub={`${data.activeWorkspaces} active`} />
        <StatsCard label="Total Users" value={data.totalUsers} sub={`${data.activeUsers} active`} />
        <StatsCard label="Total Threads" value={data.totalThreads?.toLocaleString()} />
        <StatsCard label="MRR" value={`₹${data.mrr?.toLocaleString('en-IN')}`} />
        <StatsCard label="Total Revenue" value={`₹${data.totalRevenue?.toLocaleString('en-IN')}`} />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Plan Distribution</div>
          <div className={styles.simpleTable}>
            <table>
              <thead>
                <tr><th>Plan</th><th>Count</th><th>%</th></tr>
              </thead>
              <tbody>
                {data.planDistribution?.map(p => (
                  <tr key={p.plan}>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p.plan}</td>
                    <td>{p.count}</td>
                    <td>{data.totalWorkspaces ? Math.round(p.count / data.activeWorkspaces * 100) : 0}%</td>
                  </tr>
                ))}
                {(!data.planDistribution || data.planDistribution.length === 0) && (
                  <tr><td colSpan={3} style={{ color: 'var(--text-muted)' }}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Recent Signups (30 days)</div>
          <div className={styles.simpleTable}>
            <table>
              <thead>
                <tr><th>Date</th><th>Signups</th></tr>
              </thead>
              <tbody>
                {data.recentSignups?.slice(-10).reverse().map(s => (
                  <tr key={s.date}>
                    <td>{new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td style={{ fontWeight: 600 }}>{s.count}</td>
                  </tr>
                ))}
                {(!data.recentSignups || data.recentSignups.length === 0) && (
                  <tr><td colSpan={2} style={{ color: 'var(--text-muted)' }}>No signups yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
