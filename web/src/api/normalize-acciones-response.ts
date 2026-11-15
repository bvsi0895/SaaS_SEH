export interface PaginatedPayload<T> {
  data: T[];
  total: number;
}

export interface NormalizedAccionesResponse<T> {
  data: T[];
  total: number;
  isPaginated: boolean;
}

export function normalizeAccionesResponse<T>(
  payload: T[] | PaginatedPayload<T>,
): NormalizedAccionesResponse<T> {
  if (Array.isArray(payload)) {
    return { data: payload, total: payload.length, isPaginated: false };
  }

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    total: Number.isFinite(payload.total) ? payload.total : payload.data.length,
    isPaginated: true,
  };
}
