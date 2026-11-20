import type { QueryClient, QueryKey } from '@tanstack/react-query';

export interface QueryScope {
  contextId: string | null;
  userId?: string | null;
  role?: string | null;
}

const scopeSegments = (scope: QueryScope) => [
  scope.contextId,
  scope.userId,
  scope.role,
] as const;

export const queryKeys = {
  dashboard: (scope: QueryScope) => ['dashboard', ...scopeSegments(scope)] as const,
  inspections: (scope: QueryScope) => ['inspecciones', ...scopeSegments(scope)] as const,
  inspection: (id: string, scope: QueryScope) => ['inspeccion', id, ...scopeSegments(scope)] as const,
  findings: (scope: QueryScope) => ['hallazgos', ...scopeSegments(scope)] as const,
  finding: (id: string, scope: QueryScope) => ['hallazgo', id, ...scopeSegments(scope)] as const,
  actions: (scope: QueryScope) => ['acciones', ...scopeSegments(scope)] as const,
  action: (id: string, scope: QueryScope) => ['accion', id, ...scopeSegments(scope)] as const,
};

async function invalidate(queryClient: QueryClient, keys: QueryKey[]) {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function getQueryScope(
  contextId: string | null,
  userId?: string | null,
  role?: string | null,
): QueryScope {
  return { contextId, userId, role };
}

export function invalidateInspectionQueries(
  queryClient: QueryClient,
  scope: QueryScope,
  inspectionId?: string,
) {
  const keys: QueryKey[] = [
    queryKeys.dashboard(scope),
    queryKeys.inspections(scope),
  ];
  if (inspectionId) keys.push(queryKeys.inspection(inspectionId, scope));
  return invalidate(queryClient, keys);
}

export function invalidateFindingQueries(
  queryClient: QueryClient,
  scope: QueryScope,
  findingId?: string,
  inspectionId?: string,
) {
  const keys: QueryKey[] = [
    queryKeys.dashboard(scope),
    queryKeys.findings(scope),
  ];
  if (findingId) keys.push(queryKeys.finding(findingId, scope));
  if (inspectionId) keys.push(queryKeys.inspection(inspectionId, scope));
  return invalidate(queryClient, keys);
}

export function invalidateActionQueries(
  queryClient: QueryClient,
  scope: QueryScope,
  actionId?: string,
  findingId?: string,
  inspectionId?: string,
) {
  const keys: QueryKey[] = [
    queryKeys.dashboard(scope),
    queryKeys.actions(scope),
    queryKeys.findings(scope),
  ];
  if (actionId) keys.push(queryKeys.action(actionId, scope));
  if (findingId) keys.push(queryKeys.finding(findingId, scope));
  if (inspectionId) keys.push(queryKeys.inspection(inspectionId, scope));
  return invalidate(queryClient, keys);
}
