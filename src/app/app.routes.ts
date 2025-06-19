import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'plan-medios-create',
    loadComponent: () =>
      import('./plan-medios/plan-medios-create/plan-medios-create').then(
        (m) => m.PlanMediosCreate
      ),
  },
  {
    path: 'plan-medios-resumen',
    loadComponent: () =>
      import('./plan-medios/plan-medios-resumen/plan-medios-resumen').then(
        (m) => m.PlanMediosResumen
      ),
  },
  {
    path: 'plan-medios-consulta',
    loadComponent: () =>
      import('./plan-medios/plan-medios-consulta/plan-medios-consulta').then(
        (m) => m.PlanMediosConsulta
      ),
  },
  {
    path: 'plan-medios-nueva-pauta',
    loadComponent: () =>
      import('./plan-medios/plan-medios-nueva-pauta/plan-medios-nueva-pauta').then(
        (m) => m.PlanMediosNuevaPauta
      ),
  },
  {
    path: 'kinesso/clientes',
    loadComponent: () => import('./kinesso/clientes/clientes').then((m) => m.Clientes),
  },
  {
    path: 'kinesso/provedores',
    loadComponent: () => import('./kinesso/provedores/provedores').then((m) => m.Provedores),
  },
  {
    path: 'reglas',
    loadComponent: () => import('./reglas/reglas').then((m) => m.Reglas),
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./configuracion/configuracion').then((m) => m.Configuracion),
  },
  { path: '', redirectTo: '/reglas', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
