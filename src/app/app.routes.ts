import { Routes } from '@angular/router';
import { PlanMediosCreate } from './plan-medios/plan-medios-create/plan-medios-create';
import { PlanMediosResumen } from './plan-medios/plan-medios-resumen/plan-medios-resumen';
import { Reglas } from './reglas/reglas';
import { Configuracion } from './configuracion/configuracion';

export const routes: Routes = [
  { path: 'plan-medios-create', component: PlanMediosCreate },
  { path: 'plan-medios-resumen', component: PlanMediosResumen },
  { path: 'reglas', component: Reglas },
  { path: 'configuracion', component: Configuracion },
  { path: '', redirectTo: '/reglas', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
