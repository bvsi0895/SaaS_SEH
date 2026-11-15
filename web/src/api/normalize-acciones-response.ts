export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export function normalizeAccionesResponse<T>(
  payload: T[] | PaginatedResponse<T>,
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return { data: payload, total: payload.length };
  }

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    total: Number.isFinite(payload.total) ? payload.total : payload.data.length,
  };
}
