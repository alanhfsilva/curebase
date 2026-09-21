import type {
  CreateParticipantInput,
  Participant,
  ListParticipantsResponse,
} from '@curebase/shared';

const BASE_URL = '/participants';

interface ApiErrorBody {
  error?: string;
  details?: unknown;
}

/**
 * Error thrown when the API responds with a non-2xx status. Carries the
 * HTTP status and any field-level details the server returned so callers
 * can distinguish validation failures (400), duplicate email (409), and
 * unexpected server errors (500) without inspecting `Response` directly.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status, body.details);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  async createParticipant(input: CreateParticipantInput): Promise<Participant> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<Participant>(response);
  },

  async listParticipants(params: Record<string, string>): Promise<ListParticipantsResponse> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, value);
      }
    }
    const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL;
    const response = await fetch(url);
    return handleResponse<ListParticipantsResponse>(response);
  },
};
