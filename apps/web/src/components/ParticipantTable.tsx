import type { Participant } from '@curebase/shared';
import { useSort, type SortConfig, type SortDirection } from '../hooks/useSort.js';

type SortColumn = 'name' | 'email' | 'age' | 'weight' | 'height' | 'bmi' | 'createdAt';

interface ParticipantTableProps {
  participants: Participant[];
  isLoading: boolean;
  isError: boolean;
  hasFilter: boolean;
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
}

const KG_TO_LBS = 2.20462;
const CM_TO_IN = 1 / 2.54;

function displayWeight(weight: number, unitSystem: Participant['unitSystem']): string {
  const lbs = unitSystem === 'metric' ? weight * KG_TO_LBS : weight;
  return `${Math.round(lbs * 10) / 10} lbs`;
}

function displayHeight(height: number, unitSystem: Participant['unitSystem']): string {
  const inches = unitSystem === 'metric' ? height * CM_TO_IN : height;
  return `${Math.round(inches * 10) / 10} in`;
}

function getSortValue(participant: Participant, column: SortColumn): string | number {
  switch (column) {
    case 'name':
      return `${participant.firstName} ${participant.lastName}`;
    case 'email':
      return participant.email;
    case 'age':
      return participant.age;
    case 'weight':
      return participant.unitSystem === 'metric' ? participant.weight * KG_TO_LBS : participant.weight;
    case 'height':
      return participant.unitSystem === 'metric' ? participant.height * CM_TO_IN : participant.height;
    case 'bmi':
      return participant.bmi;
    case 'createdAt':
      return participant.createdAt;
  }
}

function SortArrow({ direction }: { direction: SortDirection }) {
  return <span className="sort-arrow">{direction === 'asc' ? ' ▲' : ' ▼'}</span>;
}

interface SortableThProps {
  column: SortColumn;
  label: string;
  sortConfig: SortConfig<SortColumn> | null;
  onToggle: (column: SortColumn) => void;
}

function SortableTh({ column, label, sortConfig, onToggle }: SortableThProps) {
  const isActive = sortConfig?.column === column;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(column);
    }
  };

  return (
    <th
      className="sortable-th"
      role="button"
      tabIndex={0}
      onClick={() => onToggle(column)}
      onKeyDown={handleKeyDown}
      aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {isActive && <SortArrow direction={sortConfig.direction} />}
    </th>
  );
}

export function ParticipantTable({
  participants,
  isLoading,
  isError,
  hasFilter,
}: ParticipantTableProps) {
  const { sortConfig, toggleSort, sortItems } = useSort<SortColumn>();

  if (isLoading) {
    return <div className="empty-state">Loading participants...</div>;
  }

  if (isError) {
    return <div className="error-banner">Failed to load participants. Please try again.</div>;
  }

  if (participants.length === 0) {
    return (
      <div className="empty-state">
        {hasFilter ? 'No participants match this BMI range.' : 'No participants yet.'}
      </div>
    );
  }

  const sorted = sortItems(participants, getSortValue);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <SortableTh column="name" label="Name" sortConfig={sortConfig} onToggle={toggleSort} />
            <SortableTh column="email" label="Email" sortConfig={sortConfig} onToggle={toggleSort} />
            <th>Phone</th>
            <SortableTh column="age" label="Age" sortConfig={sortConfig} onToggle={toggleSort} />
            <SortableTh column="weight" label="Weight (lbs)" sortConfig={sortConfig} onToggle={toggleSort} />
            <SortableTh column="height" label="Height (in)" sortConfig={sortConfig} onToggle={toggleSort} />
            <SortableTh column="bmi" label="BMI" sortConfig={sortConfig} onToggle={toggleSort} />
            <SortableTh column="createdAt" label="Created" sortConfig={sortConfig} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((participant) => (
            <tr key={participant.id}>
              <td>
                {participant.firstName} {participant.lastName}
              </td>
              <td>{participant.email}</td>
              <td>{participant.phone}</td>
              <td>{participant.age}</td>
              <td>{displayWeight(participant.weight, participant.unitSystem)}</td>
              <td>{displayHeight(participant.height, participant.unitSystem)}</td>
              <td>{participant.bmi.toFixed(1)}</td>
              <td>{formatDate(participant.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
