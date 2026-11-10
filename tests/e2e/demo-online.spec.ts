import { test, expect } from '@playwright/test';

const email = process.env.SEH_DEMO_EMAIL;
const password = process.env.SEH_DEMO_PASSWORD;

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, 'Definir SEH_DEMO_EMAIL y SEH_DEMO_PASSWORD sólo al ejecutar la validación local');
});

test('recorre la demo en el viewport configurado', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || '';
    if (errorText !== 'net::ERR_ABORTED') {
      failedRequests.push(`${request.method()} ${request.url()} ${errorText}`);
    }
  });

  await page.goto('/login');
  await page.getByLabel('Correo electronico').fill(email!);
  await page.getByLabel('Contrasena').fill(password!);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  const contextSelect = page.getByLabel('Contexto activo');
  if (await contextSelect.count()) {
    await contextSelect.click();
    const demoContext = page.getByRole('option', { name: /Industria Demo Norte/ });
    if (await demoContext.count()) {
      await demoContext.click();
      await page.waitForTimeout(500);
      await page.reload();
    }
  }
  await page.screenshot({ path: `docs/VALIDACION_FASE6B/${testInfo.project.name}-dashboard.png`, fullPage: true });

  await page.goto('/administracion');
  await expect(page.getByText('Administración de consultora')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Empresas-clientes' })).toBeVisible();
  await page.getByRole('tab', { name: 'Empresas-clientes' }).click();
  await expect(page.getByText('Empresas vinculadas')).toBeVisible();
  await page.getByRole('tab', { name: 'Establecimientos' }).click({ force: true });
  await expect(page.getByText('Alta de establecimiento')).toBeVisible();
  await page.getByRole('tab', { name: 'Técnicos y accesos' }).click({ force: true });
  await expect(page.getByText('Asignar técnico a empresa')).toBeVisible();
  await page.screenshot({ path: `docs/VALIDACION_FASE6B/${testInfo.project.name}-administracion.png`, fullPage: true });

  await page.goto('/inspecciones');
  await expect(page.getByRole('heading', { name: 'Inspecciones' })).toBeVisible();
  await expect(page.locator('.MuiDataGrid-row').first()).toBeVisible();
  await page.screenshot({ path: `docs/VALIDACION_FASE6B/${testInfo.project.name}-inspecciones.png`, fullPage: true });

  const pdfButton = page.locator('button[aria-label="Descargar PDF"]').first();
  await expect(pdfButton).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await pdfButton.click({ force: true });
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

  const firstRow = page.locator('.MuiDataGrid-row').first();
  await firstRow.getByRole('button').first().click({ force: true });
  await expect(page.getByText(/Inspeccion:/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Hallazgos/ })).toBeVisible();
  await page.screenshot({ path: `docs/VALIDACION_FASE6B/${testInfo.project.name}-inspeccion-detalle.png`, fullPage: true });

  await page.goto('/checklists');
  await expect(page.getByRole('heading', { name: 'Checklists' })).toBeVisible();
  await page.goto('/hallazgos');
  await expect(page.getByRole('heading', { name: 'Hallazgos' })).toBeVisible();
  await page.goto('/acciones');
  await expect(page.getByRole('heading', { name: 'Acciones Correctivas' })).toBeVisible();

  expect(consoleErrors, `Errores de consola en ${testInfo.project.name}`).toEqual([]);
  expect(failedRequests, `Solicitudes fallidas en ${testInfo.project.name}`).toEqual([]);
});
