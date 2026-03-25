import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/',              label: 'Dashboard',     icon: '◫' },
  { to: '/workspaces',    label: 'Workspaces',    icon: '⊞' },
  { to: '/users',         label: 'Users',         icon: '⊕' },
  { to: '/subscriptions', label: 'Subscriptions', icon: '◉' },
  { to: '/transactions',  label: 'Transactions',  icon: '◈' },
  { to: '/coupons',       label: 'Coupons',       icon: '◇' },
  { to: '/plans',          label: 'Plans',         icon: '◎' },
  { to: '/support',        label: 'Support',       icon: '✦' },
  { to: '/demos',          label: 'Demos',         icon: '◆' },
];

export default function Sidebar({ user, onLogout }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>B</div>
        BrandDesk Admin
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user?.name}</div>
          <div className={styles.userEmail}>{user?.email}</div>
        </div>
        <button className={styles.logoutBtn} onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
