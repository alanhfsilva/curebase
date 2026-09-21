import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createParticipantSchema, type CreateParticipantInput } from '@curebase/shared';
import { useCreateParticipant } from '../hooks/useCreateParticipant.js';
import { ApiError } from '../api/client.js';

const SUCCESS_BANNER_TIMEOUT_MS = 3000;

// Only the unit toggle gets an explicit default; leaving the numeric fields
// undefined renders them as empty inputs instead of a misleading "0" that
// typed digits would otherwise concatenate onto (e.g. "0" + "60" = "060").
const DEFAULT_VALUES: Partial<CreateParticipantInput> = {
  unitSystem: 'us',
};

interface ParticipantFormProps {
  onSuccess?: () => void;
}

/** Type guard: does the API's 400 error payload carry field-level messages? */
function isFieldErrorDetails(details: unknown): details is Record<string, string[]> {
  if (typeof details !== 'object' || details === null) {
    return false;
  }
  return Object.values(details as Record<string, unknown>).every(
    (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string'),
  );
}

export function ParticipantForm({ onSuccess }: ParticipantFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateParticipantInput>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const unitSystem = watch('unitSystem');
  const previousUnitSystem = useRef(unitSystem);

  useEffect(() => {
    if (previousUnitSystem.current !== unitSystem) {
      resetField('weight');
      resetField('height');
      previousUnitSystem.current = unitSystem;
    }
  }, [unitSystem, resetField]);

  const mutation = useCreateParticipant();

  const applyServerError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      setServerError('An unexpected error occurred. Please try again.');
      return;
    }

    if (error.status === 409) {
      setError('email', { message: 'A participant with this email already exists' });
      return;
    }

    if (error.status === 400 && isFieldErrorDetails(error.details)) {
      for (const [field, messages] of Object.entries(error.details)) {
        setError(field as keyof CreateParticipantInput, { message: messages[0] });
      }
      return;
    }

    setServerError('An unexpected error occurred. Please try again.');
  };

  const onSubmit = async (data: CreateParticipantInput) => {
    setServerError(null);
    setShowSuccess(false);

    try {
      await mutation.mutateAsync(data);
      setShowSuccess(true);
      // Call with no arguments (not `reset(DEFAULT_VALUES)`): react-hook-form only
      // triggers the native <form>.reset(), which clears these uncontrolled
      // inputs' actual DOM values, when reset() is called with no arguments.
      // Passing a values object updates internal state but leaves stale text
      // in the DOM since these fields have no `value` prop for React to sync.
      reset();
      onSuccess?.();
    } catch (error: unknown) {
      applyServerError(error);
    }
  };

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    const timer = setTimeout(() => setShowSuccess(false), SUCCESS_BANNER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const weightLabel = unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lbs)';
  const heightLabel = unitSystem === 'metric' ? 'Height (cm)' : 'Height (inches)';

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Add Participant</h2>

      {showSuccess && <div className="success-banner">Participant added successfully!</div>}
      {serverError && <div className="error-banner">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
        >
          <div>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" {...register('firstName')} />
            {errors.firstName && <div className="field-error">{errors.firstName.message}</div>}
          </div>

          <div>
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" {...register('lastName')} />
            {errors.lastName && <div className="field-error">{errors.lastName.message}</div>}
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" {...register('email')} />
            {errors.email && <div className="field-error">{errors.email.message}</div>}
          </div>

          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" {...register('phone')} />
            {errors.phone && <div className="field-error">{errors.phone.message}</div>}
          </div>

          <div>
            <label htmlFor="age">Age</label>
            <input id="age" type="number" {...register('age', { valueAsNumber: true })} />
            {errors.age && <div className="field-error">{errors.age.message}</div>}
          </div>

          <div>
            <label htmlFor="unitSystem">Unit System</label>
            <select id="unitSystem" {...register('unitSystem')}>
              <option value="us">US (lbs / inches)</option>
              <option value="metric">Metric (kg / cm)</option>
            </select>
          </div>

          <div>
            <label htmlFor="weight">{weightLabel}</label>
            <input id="weight" type="number" step="any" {...register('weight', { valueAsNumber: true })} />
            {errors.weight && <div className="field-error">{errors.weight.message}</div>}
          </div>

          <div>
            <label htmlFor="height">{heightLabel}</label>
            <input id="height" type="number" step="any" {...register('height', { valueAsNumber: true })} />
            {errors.height && <div className="field-error">{errors.height.message}</div>}
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Participant'}
          </button>
        </div>
      </form>
    </div>
  );
}
