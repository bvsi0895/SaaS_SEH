import { syncUserWithContext as syncWebUserWithContext } from '../../../web/src/contexts/contextRole';
import { syncUserWithContext as syncMobileUserWithContext } from '../../../mobile/src/contexts/contextRole';

const user = {
  id: 'usuario-compartido',
  email: 'compartido@example.com',
  nombre: 'Usuario',
  apellido: 'Compartido',
  rol: 'TECNICO' as const,
  activo: true,
  empresaId: 'empresa-anterior',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const tecnicoContext = {
  organizacionId: 'consultora-a',
  organizacionEmpresaId: 'vinculo-a',
  empresaId: 'empresa-compartida',
  organizacionMiembroId: 'miembro-a',
  accesoEmpresaId: 'acceso-a',
  rol: 'TECNICO' as const,
};

const adminContext = {
  organizacionId: 'consultora-b',
  organizacionEmpresaId: 'vinculo-b',
  empresaId: 'empresa-compartida',
  organizacionMiembroId: 'miembro-b',
  accesoEmpresaId: 'acceso-b',
  rol: 'ADMIN_EMPRESA' as const,
};

describe.each([
  ['web', syncWebUserWithContext],
  ['mobile', syncMobileUserWithContext],
])('%s effective context role', (_client, syncUserWithContext) => {
  it('updates TECNICO to ADMIN_EMPRESA when the active context changes', () => {
    const result = syncUserWithContext(user, adminContext);

    expect(result).toMatchObject({
      id: user.id,
      rol: 'ADMIN_EMPRESA',
      empresaId: adminContext.empresaId,
      organizacionId: adminContext.organizacionId,
      organizacionEmpresaId: adminContext.organizacionEmpresaId,
    });
  });

  it('updates ADMIN_EMPRESA to TECNICO when restoring the other context', () => {
    const adminUser = syncUserWithContext(user, adminContext);
    const result = syncUserWithContext(adminUser, tecnicoContext);

    expect(result).toMatchObject({
      id: user.id,
      rol: 'TECNICO',
      empresaId: tecnicoContext.empresaId,
      organizacionId: tecnicoContext.organizacionId,
      organizacionEmpresaId: tecnicoContext.organizacionEmpresaId,
    });
  });

  it('does not change the identity when no authorized context is available', () => {
    expect(syncUserWithContext(user, undefined)).toEqual(user);
  });
});
