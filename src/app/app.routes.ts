import { Routes } from '@angular/router';
import { PlanMediosCreate } from './plan-medios/plan-medios-create/plan-medios-create';
import { PlanMediosResumen } from './plan-medios/plan-medios-resumen/plan-medios-resumen';
import { PlanMediosConsulta } from './plan-medios/plan-medios-consulta/plan-medios-consulta';
import { Reglas } from './reglas/reglas';
import { Configuracion } from './configuracion/configuracion';

export const routes: Routes = [
  { path: 'plan-medios-create', component: PlanMediosCreate },
  { path: 'plan-medios-resumen', component: PlanMediosResumen },
  { path: 'plan-medios-consulta', component: PlanMediosConsulta },
  { path: 'reglas', component: Reglas },
  { path: 'configuracion', component: Configuracion },
  { path: '', redirectTo: '/reglas', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
