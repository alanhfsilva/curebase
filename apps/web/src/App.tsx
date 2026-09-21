import { useCallback } from 'react';
import { ThemeToggle } from './components/ThemeToggle.js';
import { ParticipantForm } from './components/ParticipantForm.js';
import { ParticipantTable } from './components/ParticipantTable.js';
import { BmiFilter } from './components/BmiFilter.js';
import { Pagination } from './components/Pagination.js';
import { useParticipants } from './hooks/useParticipants.js';
import { useUrlState } from './hooks/useUrlState.js';
import './App.css';

export function App() {
  const { state, setFilter, setPage, resetPagination } = useUrlState();

  const { data, isLoading, isError } = useParticipants({
    minBmi: state.minBmi,
    maxBmi: state.maxBmi,
    cursor: state.cursor,
    direction: state.direction,
  });

  const hasFilter = Boolean(state.minBmi || state.maxBmi);

  const handleFormSuccess = useCallback(() => {
    resetPagination();
  }, [resetPagination]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>

      <ParticipantForm onSuccess={handleFormSuccess} />

      <div className="card">
        <div style={{ marginBottom: '1rem' }}>
          <BmiFilter onFilter={setFilter} />
        </div>

        <ParticipantTable
          participants={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          hasFilter={hasFilter}
        />

        {data && (
          <Pagination
            hasNextPage={data.pagination.hasNextPage}
            hasPrevPage={data.pagination.hasPrevPage}
            nextCursor={data.pagination.nextCursor}
            prevCursor={data.pagination.prevCursor}
            total={data.total}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
