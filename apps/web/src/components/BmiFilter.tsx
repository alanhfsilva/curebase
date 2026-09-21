import { useState } from 'react';

interface BmiFilterProps {
  initialMinBmi: string;
  initialMaxBmi: string;
  onFilter: (minBmi: string, maxBmi: string) => void;
}

/** Min/max BMI range inputs. Applying or clearing pushes the new filter up to the URL via `onFilter`. */
export function BmiFilter({ initialMinBmi, initialMaxBmi, onFilter }: BmiFilterProps) {
  const [minBmi, setMinBmi] = useState(initialMinBmi);
  const [maxBmi, setMaxBmi] = useState(initialMaxBmi);

  const handleApply = () => {
    onFilter(minBmi, maxBmi);
  };

  const handleClear = () => {
    setMinBmi('');
    setMaxBmi('');
    onFilter('', '');
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label htmlFor="minBmi">Min BMI</label>
        <input
          id="minBmi"
          type="number"
          step="any"
          value={minBmi}
          onChange={(e) => setMinBmi(e.target.value)}
          style={{ width: '120px' }}
        />
      </div>
      <div>
        <label htmlFor="maxBmi">Max BMI</label>
        <input
          id="maxBmi"
          type="number"
          step="any"
          value={maxBmi}
          onChange={(e) => setMaxBmi(e.target.value)}
          style={{ width: '120px' }}
        />
      </div>
      <button type="button" onClick={handleApply}>
        Filter
      </button>
      {(minBmi || maxBmi) && (
        <button type="button" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  );
}
