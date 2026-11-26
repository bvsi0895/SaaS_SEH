import type { ContextoAutorizado, Usuario } from '../types';

/**
 * The API returns the effective operational role with each authorized context.
 * Keep the legacy user identity, but project the selected tenant context onto
 * the user object consumed by the UI.
 */
export function syncUserWithContext(
  user: Usuario | null,
  context: ContextoAutorizado | undefined,
): Usuario | null {
  if (!user || !context) return user;

  return {
    ...user,
    rol: context.rol,
    empresaId: context.empresaId,
    organizacionId: context.organizacionId,
    organizacionEmpresaId: context.organizacionEmpresaId,
    rolOrganizacion: context.rolOrganizacion,
  };
}
