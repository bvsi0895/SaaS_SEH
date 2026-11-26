import { expect, test } from '@playwright/test';

const CONTEXT_A = 'context-a';
const CONTEXT_A2 = 'context-a2';
const CONTEXT_B = 'context-b';
const CHECKLIST_A = '00000000-0000-4000-8000-000000000301';
const CHECKLIST_B = '00000000-0000-4000-8000-000000000302';

test('comparte la biblioteca entre empresas de una consultora y la separa entre consultoras', async ({ page }) => {
  const payloads: Array<{ contextId: string; body: Record<string, unknown> }> = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'pr32-test-access-token'));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const contextId = request.headers()['x-organizacion-empresa-id'] || CONTEXT_A;
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.endsWith('/auth/me')) return json({ id: 'user-32', email: 'supervisor@seh.local', nombre: 'Supervisor', apellido: 'E2E', rol: 'SUPERVISOR', rolOrganizacion: 'ADMIN_ORGANIZACION', activo: true, empresaId: 'company-a' });
    if (url.pathname.endsWith('/auth/contextos')) return json([
      { organizacionId: 'org-a', organizacionEmpresaId: CONTEXT_A, empresaId: 'company-a', organizacionMiembroId: 'member-a', accesoEmpresaId: 'access-a', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A' },
      { organizacionId: 'org-a', organizacionEmpresaId: CONTEXT_A2, empresaId: 'company-a2', organizacionMiembroId: 'member-a', accesoEmpresaId: 'access-a2', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A2' },
      { organizacionId: 'org-b', organizacionEmpresaId: CONTEXT_B, empresaId: 'company-b', organizacionMiembroId: 'member-b', accesoEmpresaId: 'access-b', organizacionNombre: 'Consultora B', empresaNombre: 'Empresa B' },
    ]);
    if (url.pathname.endsWith('/auth/establecimientos')) return json([{ id: `est-${contextId}`, empresaId: contextId === CONTEXT_A2 ? 'company-a2' : contextId === CONTEXT_B ? 'company-b' : 'company-a', nombre: 'Planta activa', codigo: 'A-01', activo: true }]);
    if (url.pathname.endsWith('/checklists')) return json(contextId === CONTEXT_B
      ? [{ id: CHECKLIST_B, nombre: 'Checklist privado B', tipo: 'GENERAL', activo: true, organizacionId: 'org-b', items: [], createdAt: '', updatedAt: '' }]
      : [{ id: CHECKLIST_A, nombre: 'Checklist biblioteca A', tipo: 'GENERAL', activo: true, organizacionId: 'org-a', items: [], createdAt: '', updatedAt: '' }]);
    if (url.pathname.endsWith('/usuarios/tecnicos')) return json([{ id: 'tech-32', email: 'tech@seh.local', nombre: 'Técnico', apellido: 'E2E', rol: 'TECNICO', activo: true, empresaId: 'company-a' }]);
    if (url.pathname === '/api/inspecciones' && request.method() === 'POST') {
      payloads.push({ contextId, body: request.postDataJSON() as Record<string, unknown> });
      return json({ id: 'inspection-32', estado: 'PENDIENTE' });
    }
    return json({});
  });

  await page.goto('/inspecciones/nueva');
  await page.getByLabel('Establecimiento').click();
  await page.getByRole('option', { name: 'Planta activa' }).click();
  await page.getByLabel('Checklist').click();
  await expect(page.getByRole('option', { name: /Checklist biblioteca A/ })).toBeVisible();
  await page.getByRole('option', { name: /Checklist biblioteca A/ }).click();
  await page.getByLabel('Sector / área').fill('Sector A');

  await page.getByLabel('Contexto activo').click();
  await page.getByRole('option', { name: /Consultora A.*Empresa A2/ }).click();
  await expect(page.getByRole('combobox', { name: 'Checklist' })).toHaveText('');
  await page.getByLabel('Establecimiento').click();
  await page.getByRole('option', { name: 'Planta activa' }).click();
  await page.getByLabel('Checklist').click();
  await page.getByRole('option', { name: /Checklist biblioteca A/ }).click();
  await page.getByRole('button', { name: 'Crear y asignar' }).click();
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]).toMatchObject({ contextId: CONTEXT_A2, body: { checklistId: CHECKLIST_A, establecimientoId: `est-${CONTEXT_A2}`, sector: 'Sector A' } });
  await expect(page).toHaveURL(/\/inspecciones\/inspection-32$/);
  await page.goto('/inspecciones/nueva');

  await page.getByLabel('Contexto activo').click();
  await page.getByRole('option', { name: /Consultora B.*Empresa B/ }).click();
  await page.getByLabel('Checklist').click();
  await expect(page.getByRole('option', { name: /Checklist privado B/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Checklist biblioteca A/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByLabel('Contexto activo').click();
  await page.getByRole('option', { name: 'Consultora A · Empresa A', exact: true }).click();
  await page.getByLabel('Contexto activo').click();
  await page.getByRole('option', { name: /Consultora B.*Empresa B/ }).click();
  await page.getByLabel('Checklist').click();
  await expect(page.getByRole('option', { name: /Checklist privado B/ })).toBeVisible();
  await expect(page.getByRole('option', { name: /Checklist biblioteca A/ })).toHaveCount(0);
});
