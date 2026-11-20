import { expect, test, type Page, type Route } from '@playwright/test';

const CONTEXT_A = 'context-a';
const CONTEXT_B = 'context-b';
const ESTABLISHMENTS = {
  [CONTEXT_A]: [{ id: 'est-a', nombre: 'Planta Norte', codigo: 'N-01' }],
  [CONTEXT_B]: [{ id: 'est-b', nombre: 'Planta Sur', codigo: 'S-01' }],
};

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
});
