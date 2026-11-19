import { expect, test, type Page, type Route } from '@playwright/test';

const ORGANIZATION_A = 'context-a';
const ORGANIZATION_B = 'context-b';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type LogoScenario = 'logo' | 'missing' | 'error' | 'switch';

async function installApiMocks(page: Page, scenario: LogoScenario) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'pr19-test-access-token');
  });

  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const contextId = route.request().headers()['x-organizacion-empresa-id'];

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1', email: 'test@seh.local', nombre: 'Test', apellido: 'User',
          rol: 'ADMIN_EMPRESA', activo: true, empresaId: 'company-1',
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/contextos')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { organizacionId: 'org-a', organizacionEmpresaId: ORGANIZATION_A, empresaId: 'company-1', organizacionMiembroId: 'member-a', accesoEmpresaId: 'access-a', organizacionNombre: 'Consultora A', empresaNombre: 'Empresa A' },
          { organizacionId: 'org-b', organizacionEmpresaId: ORGANIZATION_B, empresaId: 'company-1', organizacionMiembroId: 'member-b', accesoEmpresaId: 'access-b', organizacionNombre: 'Consultora B', empresaNombre: 'Empresa B' },
        ]),
      });
      return;
    }

    if (url.pathname.endsWith('/organizaciones/me/logo')) {
      if (scenario === 'error') {
        await route.abort('failed');
        return;
      }
      if (scenario === 'missing' || (scenario === 'switch' && contextId === ORGANIZATION_B)) {
        if (scenario === 'switch') await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({ contentType: 'image/png', body: ONE_PIXEL_PNG });
      return;
    }

    if (url.pathname.endsWith('/auth/establecimientos') || url.pathname.endsWith('/dashboard/top-sectores')) {
      await route.fulfill({ contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname.endsWith('/dashboard/kpis')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        inspeccionesEsteMes: 0, inspeccionesMesAnterior: 0, inspeccionesCompletadasEsteMes: 0,
        variacionMensual: null, hallazgosTotal: 0, hallazgosAbiertos: 0, hallazgosCriticos: 0,
        hallazgosAltos: 0, accionesTotal: 0, accionesPendientes: 0, accionesEnProgreso: 0,
        accionesResueltas: 0, accionesVencidas: 0, tasaCumplimiento: null,
      }) });
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

async function openDashboard(page: Page, scenario: LogoScenario) {
  await installApiMocks(page, scenario);
  await page.goto('/');
  await expect(page.getByText('Sistema de Seguridad e Higiene')).toBeVisible();
}

async function openMobileDrawer(page: Page) {
  if (page.viewportSize()?.width && page.viewportSize()!.width < 600) {
    await page.getByRole('button').first().click();
  }
}

test.describe('PR #19 logo de consultora', () => {
  test('muestra el logo cargado', async ({ page }) => {
    await openDashboard(page, 'logo');
    await openMobileDrawer(page);
    await expect(page.getByTestId('organization-logo')).toBeVisible();
    await expect(page.getByTestId('organization-logo')).toHaveAttribute('alt', 'Logo de la consultora');
    await expect(page.getByTestId('seh-logo-fallback')).toHaveCount(0);
  });

  test('mantiene SEH cuando la consultora no tiene logo', async ({ page }) => {
    await openDashboard(page, 'missing');
    await openMobileDrawer(page);
    await expect(page.getByTestId('seh-logo-fallback')).toHaveText('SEH');
    await expect(page.getByTestId('organization-logo')).toHaveCount(0);
  });

  test('mantiene SEH ante un error de carga', async ({ page }) => {
    await openDashboard(page, 'error');
    await openMobileDrawer(page);
    await expect(page.getByTestId('seh-logo-fallback')).toHaveText('SEH');
    await expect(page.getByTestId('organization-logo')).toHaveCount(0);
  });

  test('descarta el logo anterior al cambiar de organización', async ({ page }) => {
    await openDashboard(page, 'switch');
    await openMobileDrawer(page);
    await expect(page.getByTestId('organization-logo')).toBeVisible();
    if (page.viewportSize()?.width && page.viewportSize()!.width < 600) {
      await page.getByRole('button').first().click();
    }

    await page.getByLabel('Contexto activo').click();
    await page.getByRole('option', { name: /Consultora B/ }).click();
    await openMobileDrawer(page);

    await expect(page.getByTestId('seh-logo-fallback')).toBeVisible();
    await expect(page.getByTestId('organization-logo')).toHaveCount(0);
  });
});

