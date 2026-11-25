import { expect, test, type Page, type Route } from '@playwright/test';

const CONTEXT_A = 'context-a';
const CONTEXT_B = 'context-b';
const CHECKLIST_A = '00000000-0000-4000-8000-000000000201';
const CHECKLIST_B = '00000000-0000-4000-8000-000000000202';

function makeState(initialInspectionStatus = 'EN_PROGRESO') {
  return {
    inspectionStatus: initialInspectionStatus,
    finding: null as Record<string, unknown> | null,
    actionStatus: 'PENDIENTE',
    refreshes: {
      dashboard: 0,
      inspections: 0,
      findings: 0,
      actions: 0,
    },
    createdPayloads: [] as Array<{ contextId: string; body: Record<string, unknown> }>,
  };
}

function inspection(state: ReturnType<typeof makeState>) {
  return {
    id: 'inspection-1',
    sector: 'Producción',
    descripcion: 'Inspección E2E',
    estado: state.inspectionStatus,
    fechaHoraInicio: '2026-11-20T12:00:00.000Z',
    fechaHoraFin: state.inspectionStatus === 'COMPLETADA' ? '2026-11-20T12:30:00.000Z' : null,
    empresaId: 'company-a',
    usuarioId: 'user-1',
    creadoPorId: 'user-1',
    asignadoAId: 'user-1',
    checklistId: CHECKLIST_A,
    establecimientoId: 'est-a',
    establecimiento: { id: 'est-a', nombre: 'Planta Norte', codigo: 'N-01' },
    creadoPor: { id: 'user-1', nombre: 'Admin', apellido: 'E2E' },
    asignadoA: { id: 'user-1', nombre: 'Admin', apellido: 'E2E' },
    checklist: { id: CHECKLIST_A, nombre: 'Checklist General', tipo: 'GENERAL', activo: true, empresaId: 'company-a', createdAt: '', updatedAt: '' },
    items: [{ id: 'item-1', cumplimiento: 'CUMPLE', observacion: '', inspeccionId: 'inspection-1', checklistItemId: 'check-item-1', checklistItem: { id: 'check-item-1', descripcion: 'Orden y limpieza', orden: 1, obligatorio: true, checklistId: CHECKLIST_A } }],
    hallazgos: state.finding ? [state.finding] : [],
    createdAt: '2026-11-20T12:00:00.000Z',
    updatedAt: '2026-11-20T12:00:00.000Z',
  };
}

function finding(state: ReturnType<typeof makeState>) {
  return state.finding || {
    id: 'finding-1',
    titulo: 'Hallazgo E2E',
    descripcion: 'Descripción del hallazgo E2E',
    nivelRiesgo: 'ALTO',
    ubicacionTexto: 'Sector A',
    inspeccionId: 'inspection-1',
    inspeccion: { id: 'inspection-1', sector: 'Producción', usuario: { id: 'user-1', nombre: 'Admin', apellido: 'E2E' } },
    accionesCorrectivas: [],
    createdAt: '2026-11-20T12:10:00.000Z',
    updatedAt: '2026-11-20T12:10:00.000Z',
  };
}

async function installMocks(page: Page, initialInspectionStatus = 'EN_PROGRESO') {
  const state = makeState(initialInspectionStatus);
  await page.addInitScript(() => localStorage.setItem('accessToken', 'pr21-test-access-token'));
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const method = request.method();
    const contextId = request.headers()['x-organizacion-empresa-id'] || CONTEXT_A;
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.endsWith('/auth/me')) {
      await json({ id: 'user-1', email: 'admin@seh.local', nombre: 'Admin', apellido: 'E2E', rol: 'ADMIN_EMPRESA', activo: true, empresaId: 'company-a' });
      return;
    }
    if (url.pathname.endsWith('/auth/contextos')) {
      await json([
        { organizacionId: 'org-a', organizacionEmpresaId: CONTEXT_A, empresaId: 'company-a', organizacionMiembroId: 'member-a', accesoEmpresaId: 'access-a', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A' },
        { organizacionId: 'org-b', organizacionEmpresaId: CONTEXT_B, empresaId: 'company-b', organizacionMiembroId: 'member-b', accesoEmpresaId: 'access-b', organizacionNombre: 'Consultora B', empresaNombre: 'Empresa B' },
      ]);
      return;
    }
    if (url.pathname.endsWith('/auth/establecimientos')) {
      await json(contextId === CONTEXT_B
        ? [{ id: 'est-b', empresaId: 'company-b', nombre: 'Planta Sur', codigo: 'S-01', activo: true }]
        : [{ id: 'est-a', empresaId: 'company-a', nombre: 'Planta Norte', codigo: 'N-01', activo: true }]);
      return;
    }
    if (url.pathname.endsWith('/checklists')) {
      const isContextB = contextId === CONTEXT_B;
      await json(isContextB
        ? [
          { id: 'demo-online-checklist-sur', nombre: 'Checklist legacy no utilizable', tipo: 'GENERAL', activo: true, empresaId: 'company-b', items: [], createdAt: '', updatedAt: '' },
          { id: CHECKLIST_B, nombre: 'Checklist Sur', tipo: 'GENERAL', activo: true, empresaId: 'company-b', items: [], createdAt: '', updatedAt: '' },
        ]
        : [{ id: CHECKLIST_A, nombre: 'Checklist General', tipo: 'GENERAL', activo: true, empresaId: 'company-a', items: [], createdAt: '', updatedAt: '' }]);
      return;
    }
    if (url.pathname.endsWith('/usuarios/tecnicos')) {
      await json([{ id: 'user-1', email: 'admin@seh.local', nombre: 'Admin', apellido: 'E2E', rol: 'TECNICO', activo: true, empresaId: 'company-a' }]);
      return;
    }
    if (url.pathname.endsWith('/dashboard/kpis')) {
      if (method === 'GET') state.refreshes.dashboard += 1;
      await json({ inspeccionesEsteMes: contextId === CONTEXT_B ? 9 : state.inspectionStatus === 'COMPLETADA' ? 2 : 1, inspeccionesMesAnterior: 0, inspeccionesCompletadasEsteMes: state.inspectionStatus === 'COMPLETADA' ? 1 : 0, variacionMensual: null, hallazgosTotal: state.finding ? 1 : 0, hallazgosAbiertos: state.finding ? 1 : 0, hallazgosCriticos: 0, hallazgosAltos: state.finding ? 1 : 0, accionesTotal: state.actionStatus === 'RESUELTA' ? 1 : 0, accionesPendientes: state.actionStatus === 'PENDIENTE' ? 1 : 0, accionesEnProgreso: state.actionStatus === 'EN_PROGRESO' ? 1 : 0, accionesResueltas: state.actionStatus === 'RESUELTA' ? 1 : 0, accionesVencidas: 0, tasaCumplimiento: 100 });
      return;
    }
    if (url.pathname.endsWith('/dashboard/tendencias')) { await json({ inspecciones: {}, hallazgos: {} }); return; }
    if (url.pathname.endsWith('/dashboard/top-sectores')) { await json([]); return; }
    if (url.pathname.endsWith('/dashboard/actividad-reciente')) { await json({ inspecciones: [], hallazgos: [], acciones: [] }); return; }

    if (url.pathname === '/api/inspecciones' && method === 'GET') {
      state.refreshes.inspections += 1;
      await json({ data: [inspection(state)], total: 1 });
      return;
    }
    if (url.pathname === '/api/inspecciones' && method === 'POST') {
      state.createdPayloads.push({ contextId, body: request.postDataJSON() as Record<string, unknown> });
      state.inspectionStatus = 'PENDIENTE';
      await json(inspection(state));
      return;
    }
    if (url.pathname.endsWith('/inspecciones/inspection-1')) {
      if (method === 'GET') await json(inspection(state));
      else await json(inspection(state));
      return;
    }
    if (url.pathname.endsWith('/inspecciones/inspection-1/iniciar') && method === 'POST') {
      state.inspectionStatus = 'EN_PROGRESO';
      await json(inspection(state));
      return;
    }
    if (url.pathname.endsWith('/inspecciones/inspection-1/finalizar') && method === 'POST') {
      state.inspectionStatus = 'COMPLETADA';
      await json(inspection(state));
      return;
    }
    if (url.pathname.endsWith('/inspecciones/inspection-1/cancelar') && method === 'POST') {
      state.inspectionStatus = 'CANCELADA';
      await json(inspection(state));
      return;
    }

    if (url.pathname === '/api/hallazgos' && method === 'GET') {
      state.refreshes.findings += 1;
      await json({ data: state.finding ? [finding(state)] : [], total: state.finding ? 1 : 0 });
      return;
    }
    if (url.pathname === '/api/hallazgos' && method === 'POST') {
      state.finding = { ...finding(state), ...request.postDataJSON(), id: 'finding-1' };
      await json(state.finding);
      return;
    }
    if (url.pathname.endsWith('/hallazgos/finding-1') && method === 'GET') { await json(finding(state)); return; }

    if (url.pathname === '/api/acciones-correctivas' && method === 'GET') {
      state.refreshes.actions += 1;
      await json({ data: [{ id: 'action-1', descripcion: 'Acción E2E', fechaCompromiso: '2026-12-01T00:00:00.000Z', estado: state.actionStatus, hallazgoId: 'finding-1', hallazgo: finding(state), responsableId: 'user-1', responsable: { id: 'user-1', nombre: 'Admin', apellido: 'E2E' } }], total: 1 });
      return;
    }
    if (url.pathname.endsWith('/acciones-correctivas/action-1') && method === 'GET') {
      await json({ id: 'action-1', descripcion: 'Acción E2E', fechaCompromiso: '2026-12-01T00:00:00.000Z', estado: state.actionStatus, hallazgoId: 'finding-1', hallazgo: finding(state), responsableId: 'user-1', responsable: { id: 'user-1', nombre: 'Admin', apellido: 'E2E' } });
      return;
    }
    if (url.pathname.endsWith('/acciones-correctivas/action-1/iniciar') && method === 'PATCH') { state.actionStatus = 'EN_PROGRESO'; await json({ id: 'action-1', hallazgoId: 'finding-1', estado: state.actionStatus }); return; }
    if (url.pathname.endsWith('/acciones-correctivas/action-1/cerrar') && method === 'POST') { state.actionStatus = 'RESUELTA'; await json({ id: 'action-1', hallazgoId: 'finding-1', estado: state.actionStatus }); return; }

    await json({});
  });
  return state;
}

async function dashboardRefreshCount(page: Page, state: ReturnType<typeof makeState>) {
  const before = state.refreshes.dashboard;
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByText('Sistema de Seguridad e Higiene')).toBeVisible();
  await expect.poll(() => state.refreshes.dashboard).toBeGreaterThan(before);
}

test.describe('PR #21 sincronización de consultas', () => {
  test('crea una inspección y refresca dashboard/listado sin recargar', async ({ page }) => {
    const state = await installMocks(page);
    await page.goto('/');
    await expect(page.getByText('Sistema de Seguridad e Higiene')).toBeVisible();
    const dashboardBefore = state.refreshes.dashboard;

    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await page.getByRole('button', { name: 'Nueva inspección' }).click();
    await page.getByLabel('Establecimiento').click();
    await page.getByRole('option', { name: 'Planta Norte' }).click();
    await page.getByLabel('Checklist').click();
    await page.getByRole('option', { name: /Checklist General/ }).click();
    await page.getByLabel('Sector / área').fill('Producción');
    await page.getByRole('button', { name: 'Crear y asignar' }).click();
    await expect(page).toHaveURL(/\/inspecciones\/inspection-1$/);
    await dashboardRefreshCount(page, state);
    expect(state.refreshes.dashboard).toBeGreaterThan(dashboardBefore);
    expect(state.refreshes.inspections).toBeGreaterThan(0);
  });

  test('reinicia selecciones dependientes y crea con el checklist del contexto activo', async ({ page }) => {
    const state = await installMocks(page);
    await page.goto('/inspecciones/nueva');

    await page.getByLabel('Establecimiento').click();
    await page.getByRole('option', { name: 'Planta Norte' }).click();
    await page.getByLabel('Checklist').click();
    await page.getByRole('option', { name: /Checklist General/ }).click();
    await page.getByLabel('Sector / área').fill('Sector conservado');

    await page.getByLabel('Contexto activo').click();
    await page.getByRole('option', { name: /Consultora B.*Empresa B/ }).click();
    await expect(page.locator('#establishment-filter')).toHaveText('');
    await expect(page.getByRole('combobox', { name: 'Checklist' })).toHaveText('');
    await expect(page.getByLabel('Sector / área')).toHaveValue('Sector conservado');

    await page.getByLabel('Establecimiento').click();
    await page.getByRole('option', { name: 'Planta Sur' }).click();
    await page.getByLabel('Checklist').click();
    await expect(page.getByRole('option', { name: /Checklist legacy no utilizable/ })).toHaveCount(0);
    await page.getByRole('option', { name: /Checklist Sur/ }).click();
    await page.getByRole('button', { name: 'Crear y asignar' }).click();

    expect(state.createdPayloads).toHaveLength(1);
    expect(state.createdPayloads[0]).toMatchObject({
      contextId: CONTEXT_B,
      body: { checklistId: CHECKLIST_B, establecimientoId: 'est-b', sector: 'Sector conservado' },
    });

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await page.getByLabel('Contexto activo').click();
    await page.getByRole('option', { name: /Consultora A.*Empresa A/ }).click();
    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await page.getByRole('button', { name: 'Nueva inspección' }).click();
    await expect(page.locator('#establishment-filter')).toHaveText('');
    await expect(page.getByRole('combobox', { name: 'Checklist' })).toHaveText('');
  });

  test('inicia una inspección y refresca su detalle y el dashboard', async ({ page }) => {
    const state = await installMocks(page, 'PENDIENTE');
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await expect(page.getByText('Producción', { exact: true })).toBeVisible();
    await page.locator('[role="row"]').filter({ hasText: 'Producción' }).getByRole('button').first().click();
    const dashboardBefore = state.refreshes.dashboard;
    await page.getByRole('button', { name: 'Iniciar inspección' }).click();
    await expect.poll(() => state.inspectionStatus).toBe('EN_PROGRESO');
    await dashboardRefreshCount(page, state);
    expect(state.refreshes.dashboard).toBeGreaterThan(dashboardBefore);
  });

  test('finaliza una inspección y actualiza el contador del dashboard', async ({ page }) => {
    const state = await installMocks(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await expect(page.getByText('Producción', { exact: true })).toBeVisible();
    await page.locator('[role="row"]').filter({ hasText: 'Producción' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Finalizar Inspeccion' }).click();
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await expect(page.getByText('COMPLETADA')).toBeVisible();
    await dashboardRefreshCount(page, state);
    await expect(page.getByText('2', { exact: true })).toBeVisible();
  });

  test('cancela una inspección y refresca el estado sin recargar', async ({ page }) => {
    const state = await installMocks(page, 'PENDIENTE');
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await expect(page.getByText('Producción', { exact: true })).toBeVisible();
    await page.locator('[role="row"]').filter({ hasText: 'Producción' }).getByRole('button').first().click();
    page.on('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Cancelar inspección' }).click();
    await expect.poll(() => state.inspectionStatus).toBe('CANCELADA');
    await dashboardRefreshCount(page, state);
  });

  test('registra un hallazgo y refresca indicadores y listados relacionados', async ({ page }) => {
    const state = await installMocks(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspecciones' }).click();
    await expect(page.getByText('Producción', { exact: true })).toBeVisible();
    await page.locator('[role="row"]').filter({ hasText: 'Producción' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Registrar Hallazgo' }).click();
    await page.getByLabel('Titulo').fill('Hallazgo E2E');
    await page.getByLabel('Descripcion').fill('Descripción del hallazgo E2E');
    await page.getByLabel('Ubicacion').fill('Sector A');
    await page.getByRole('button', { name: 'Crear Hallazgo' }).click();
    await page.goto('/hallazgos');
    await expect(page.getByText('Hallazgo E2E')).toBeVisible();
    expect(state.refreshes.findings).toBeGreaterThan(0);
    await dashboardRefreshCount(page, state);
    expect(state.finding).not.toBeNull();
  });

  test('resuelve una acción correctiva y refresca sus indicadores', async ({ page }) => {
    const state = await installMocks(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Acciones Correctivas' }).click();
    await expect(page.getByText('Acción E2E', { exact: true })).toBeVisible();
    await page.locator('[role="row"]').filter({ hasText: 'Acción E2E' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Iniciar Accion' }).click();
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar como Resuelta' })).toBeVisible();
    await page.getByRole('button', { name: 'Marcar como Resuelta' }).click();
    await page.getByRole('button', { name: 'Resolver', exact: true }).click();
    await expect(page.getByText('Resuelta', { exact: true })).toBeVisible();
    await dashboardRefreshCount(page, state);
    expect(state.actionStatus).toBe('RESUELTA');
    expect(state.refreshes.actions).toBeGreaterThan(0);
  });

  test('separa dashboard por contexto y establecimiento activo', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await page.getByLabel('Establecimiento').click();
    await page.getByRole('option', { name: 'Planta Norte' }).click();
    await expect(page).toHaveURL('/');
    await page.getByLabel('Contexto activo').click();
    await page.getByRole('option', { name: /Consultora B/ }).click();
    await expect(page.getByLabel('Establecimiento')).toBeVisible();
    await page.getByLabel('Establecimiento').click();
    await expect(page.getByRole('option', { name: 'Planta Sur' })).toBeVisible();
    await page.getByRole('option', { name: 'Planta Sur' }).click();
    await expect(page.getByText('9', { exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Planta Norte' })).toHaveCount(0);
  });
});
