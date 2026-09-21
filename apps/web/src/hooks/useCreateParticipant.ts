import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import type { CreateParticipantInput, Participant } from '@curebase/shared';

/**
 * TanStack mutation for creating a participant. On success, invalidates the
 * `participants` query cache so any participant list re-fetches fresh data.
 */
export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation<Participant, unknown, CreateParticipantInput>({
    mutationFn: (input: CreateParticipantInput) => apiClient.createParticipant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
  });
}
