import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout({ user, onLogout, children }) {
  return (
    <div className={styles.layout}>
      <Sidebar user={user} onLogout={onLogout} />
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
