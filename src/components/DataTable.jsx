import styles from './DataTable.module.css';

export default function DataTable({
  columns,        // [{ key, label, render? }]
  data,           // array of row objects
  total = 0,
  page = 1,
  limit = 25,
  onPageChange,   // (newPage) => void
  onRowClick,     // (row) => void — makes rows clickable
  toolbar,        // ReactNode — search/filter controls
  emptyText = 'No data found',
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className={styles.wrapper}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}

      {data.length === 0 ? (
        <div className={styles.empty}>{emptyText}</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className={onRowClick ? styles.clickableRow : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {total > limit && (
        <div className={styles.pagination}>
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className={styles.pageBtns}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </button>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export action button styles for use in pages
export { styles as tableStyles };
