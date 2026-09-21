import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import type { ListParticipantsResponse } from '@curebase/shared';

export interface UseParticipantsParams {
  minBmi?: string;
  maxBmi?: string;
  cursor?: string;
  direction?: string;
  limit?: string;
}

function toQueryParams(params: UseParticipantsParams): Record<string, string> {
  const queryParams: Record<string, string> = {};

  if (params.minBmi) queryParams.minBmi = params.minBmi;
  if (params.maxBmi) queryParams.maxBmi = params.maxBmi;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.direction) queryParams.direction = params.direction;
  if (params.limit) queryParams.limit = params.limit;

  return queryParams;
}

/**
 * TanStack Query wrapper around `apiClient.listParticipants`. The query key
 * includes every filter/pagination param so switching the BMI range or
 * paging forward/back triggers a fresh fetch instead of serving stale data.
 */
export function useParticipants(
  params: UseParticipantsParams,
): UseQueryResult<ListParticipantsResponse> {
  const queryParams = toQueryParams(params);

  return useQuery({
    queryKey: ['participants', queryParams],
    queryFn: () => apiClient.listParticipants(queryParams),
  });
}
