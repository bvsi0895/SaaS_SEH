import { expect, test, type Page, type Route } from '@playwright/test';

const CONTEXT_A = 'context-a';
const CONTEXT_B = 'context-b';
const ESTABLISHMENTS = {
  [CONTEXT_A]: [{ id: 'est-a', nombre: 'Planta Norte', codigo: 'N-01' }],
  [CONTEXT_B]: [{ id: 'est-b', nombre: 'Planta Sur', codigo: 'S-01' }],
};

async function installAdministrationMocks(page: Page) {
  const assignment = { establecimientoIds: ['est-a'] };
  let lastAssignmentRequest: Record<string, unknown> | null = null;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'pr20-admin-test-access-token'));
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        id: 'admin-user', email: 'admin@seh.local', nombre: 'Admin', apellido: 'Consultora',
        rol: 'ADMIN_EMPRESA', activo: true, empresaId: 'company-1',
      }) });
      return;
    }
    if (url.pathname.endsWith('/auth/contextos')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { organizacionId: 'org-a', organizacionEmpresaId: CONTEXT_A, empresaId: 'company-1', organizacionMiembroId: 'member-admin', accesoEmpresaId: 'access-admin', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A' },
      ]) });
      return;
    }
    if (url.pathname.endsWith('/organizaciones/me') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'org-a', nombre: 'Consultora A', tipo: 'CONSULTORA', activa: true }) });
      return;
    }
    if (url.pathname.endsWith('/organizaciones/me/empresas') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'company-context-a', estado: 'ACTIVA', empresa: { id: 'company-1', nombre: 'Empresa A', activa: true, _count: { establecimientos: 2 } } }]) });
      return;
    }
    if (url.pathname.endsWith('/organizaciones/me/miembros') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'member-tech', rol: 'AUDITOR_ORGANIZACION', activa: true, usuarioId: 'user-tech', usuario: { id: 'user-tech', email: 'lucia@seh.local', nombre: 'Lucía', apellido: 'Técnica', rol: 'TECNICO', activo: true } },
        { id: 'member-admin', rol: 'ADMIN_ORGANIZACION', activa: true, usuarioId: 'admin-user', usuario: { id: 'admin-user', email: 'admin@seh.local', nombre: 'Admin', apellido: 'Consultora', rol: 'ADMIN_EMPRESA', activo: true } },
      ]) });
      return;
    }
    if (url.pathname.endsWith('/establecimientos') && route.request().method() === 'GET' && !url.pathname.includes('/auth/')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'est-a', empresaId: 'company-1', nombre: 'Planta Norte', codigo: 'N-01', activo: true },
        { id: 'est-b', empresaId: 'company-1', nombre: 'Planta Sur', codigo: 'S-01', activo: true },
      ]) });
      return;
    }
    if (url.pathname.endsWith('/asignaciones') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { id: 'access-tech', organizacionMiembroId: 'member-tech', rol: 'TECNICO', activo: true, establecimientos: assignment.establecimientoIds.map((establecimientoId) => ({ establecimientoId })), organizacionMiembro: { usuario: { id: 'user-tech', nombre: 'Lucía', apellido: 'Técnica' } } },
        { id: 'access-admin', organizacionMiembroId: 'member-admin', rol: 'ADMIN_EMPRESA', activo: true, establecimientos: [], organizacionMiembro: { usuario: { id: 'admin-user', nombre: 'Admin', apellido: 'Consultora' } } },
      ]) });
      return;
    }
    if (url.pathname.endsWith('/asignaciones') && route.request().method() === 'POST') {
      lastAssignmentRequest = route.request().postDataJSON() as Record<string, unknown>;
      assignment.establecimientoIds = (lastAssignmentRequest.establecimientoIds as string[]) || [];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'access-tech', organizacionMiembroId: lastAssignmentRequest.organizacionMiembroId, rol: lastAssignmentRequest.rol, activo: true, establecimientos: assignment.establecimientoIds.map((establecimientoId) => ({ establecimientoId })) }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  return { getLastAssignmentRequest: () => lastAssignmentRequest };
}

async function installMocks(page: Page) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'pr20-test-access-token'));
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const contextId = route.request().headers()['x-organizacion-empresa-id'] || CONTEXT_A;
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        id: 'tech-1', email: 'tecnico@seh.local', nombre: 'Lucía', apellido: 'Técnica',
        rol: 'TECNICO', activo: true, empresaId: 'company-1',
      }) });
      return;
    }
    if (url.pathname.endsWith('/auth/contextos')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
        { organizacionId: 'org-a', organizacionEmpresaId: CONTEXT_A, empresaId: 'company-1', organizacionMiembroId: 'member-a', accesoEmpresaId: 'access-a', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A' },
        { organizacionId: 'org-b', organizacionEmpresaId: CONTEXT_B, empresaId: 'company-2', organizacionMiembroId: 'member-b', accesoEmpresaId: 'access-b', organizacionNombre: 'Consultora B', empresaNombre: 'Empresa B' },
      ]) });
      return;
    }
    if (url.pathname.endsWith('/auth/establecimientos')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(ESTABLISHMENTS[contextId as keyof typeof ESTABLISHMENTS] || []) });
      return;
    }
    if (url.pathname.endsWith('/dashboard/kpis')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        inspeccionesEsteMes: 1, inspeccionesMesAnterior: 0, inspeccionesCompletadasEsteMes: 1,
        variacionMensual: null, hallazgosTotal: 0, hallazgosAbiertos: 0, hallazgosCriticos: 0,
        hallazgosAltos: 0, accionesTotal: 0, accionesPendientes: 0, accionesEnProgreso: 0,
        accionesResueltas: 0, accionesVencidas: 0, tasaCumplimiento: null,
      }) });
      return;
    }
    if (url.pathname.endsWith('/dashboard/top-sectores')) {
      await route.fulfill({ contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname.endsWith('/dashboard/tendencias')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ inspecciones: {}, hallazgos: {} }) });
      return;
    }
    if (url.pathname.endsWith('/dashboard/actividad-reciente')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ inspecciones: [], hallazgos: [], acciones: [] }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
}

test.describe('PR #20 multiestablecimiento', () => {
  test('muestra los establecimientos autorizados y solicita estadísticas filtradas', async ({ page }) => {
    await installMocks(page);
    const filteredRequest = page.waitForRequest((request) => request.url().includes('/dashboard/kpis') && request.url().includes('establecimientoId=est-a'));
    await page.goto('/');
    await expect(page.getByText('Sistema de Seguridad e Higiene')).toBeVisible();
    await expect(page.getByLabel('Establecimiento')).toBeVisible();
    await page.getByLabel('Establecimiento').click();
    await expect(page.getByRole('option', { name: 'Planta Norte' })).toBeVisible();
    await page.getByRole('option', { name: 'Planta Norte' }).click();
    await filteredRequest;
  });

  test('cambia el contexto y reemplaza las opciones por las de la empresa activa', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await expect(page.getByLabel('Establecimiento')).toBeVisible();
    await page.getByLabel('Contexto activo').click();
    await page.getByRole('option', { name: /Consultora B/ }).click();
    await page.getByLabel('Establecimiento').click();
    await expect(page.getByRole('option', { name: 'Planta Sur' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Planta Norte' })).toHaveCount(0);
  });

  test('edita un técnico existente con su membresía y persiste sus establecimientos', async ({ page }) => {
    const mocks = await installAdministrationMocks(page);
    await page.goto('/administracion');
    await page.getByRole('tab', { name: 'Técnicos y accesos' }).click();
    await expect(page.getByTestId('assignment-access-tech')).toContainText('1 establecimiento(s) asignado(s)');

    const memberSelect = page.getByRole('combobox').nth(3);
    const establishmentSelect = page.getByRole('combobox').nth(4);
    await page.getByTestId('assignment-access-tech').getByRole('button', { name: 'Editar' }).click();
    await expect(memberSelect).toBeVisible();
    await establishmentSelect.click();
    await page.getByRole('option', { name: 'Planta Sur' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Guardar asignaciones' }).click();

    await expect(page.getByTestId('assignment-access-tech')).toContainText('2 establecimiento(s) asignado(s)');
    expect(mocks.getLastAssignmentRequest()).toEqual(expect.objectContaining({
      organizacionMiembroId: 'member-tech',
      rol: 'TECNICO',
      establecimientoIds: ['est-a', 'est-b'],
    }));
    await memberSelect.click();
    await expect(page.getByRole('option', { name: 'Admin Consultora' })).toHaveCount(0);
  });
});
