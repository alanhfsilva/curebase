import type { Participant } from '@curebase/shared';

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

function weightSuffix(unitSystem: Participant['unitSystem']): string {
  return unitSystem === 'metric' ? 'kg' : 'lbs';
}

function heightSuffix(unitSystem: Participant['unitSystem']): string {
  return unitSystem === 'metric' ? 'cm' : 'in';
}

/** Participant data table with the required loading / error / empty states. */
export function ParticipantTable({
  participants,
  isLoading,
  isError,
  hasFilter,
}: ParticipantTableProps) {
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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Age</th>
            <th>Weight</th>
            <th>Height</th>
            <th>BMI</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td>
                {participant.firstName} {participant.lastName}
              </td>
              <td>{participant.email}</td>
              <td>{participant.phone}</td>
              <td>{participant.age}</td>
              <td>
                {participant.weight} {weightSuffix(participant.unitSystem)}
              </td>
              <td>
                {participant.height} {heightSuffix(participant.unitSystem)}
              </td>
              <td>{participant.bmi.toFixed(1)}</td>
              <td>{formatDate(participant.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
