interface PaginationProps {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  onPage: (cursor: string, direction: 'next' | 'prev') => void;
}

/** Previous/Next controls driven by keyset cursors. No page numbers, per FR-5.5. */
export function Pagination({
  hasNextPage,
  hasPrevPage,
  nextCursor,
  prevCursor,
  total,
  onPage,
}: PaginationProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {total} participant{total !== 1 ? 's' : ''} total
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          disabled={!hasPrevPage}
          onClick={() => prevCursor && onPage(prevCursor, 'prev')}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => nextCursor && onPage(nextCursor, 'next')}
        >
          Next
        </button>
      </div>
    </div>
  );
}
