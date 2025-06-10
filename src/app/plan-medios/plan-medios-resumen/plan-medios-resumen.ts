import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ResumenPlan, RESUMEN_PLAN_EJEMPLO } from '../models/resumen-plan.model';

@Component({
  selector: 'app-plan-medios-resumen',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './plan-medios-resumen.html',
  styleUrls: ['./plan-medios-resumen.scss']
})
export class PlanMediosResumen implements OnInit {
  resumenPlan: ResumenPlan = RESUMEN_PLAN_EJEMPLO;
  displayedColumns: string[] = ['medio', 'salidas', 'valorNeto', 'soi', 'semanas'];
  semanasColumnas: string[] = ['L1', 'L7', 'L14', 'L21', 'L28'];

  constructor() {}

  ngOnInit(): void {}

  onNuevaPauta(): void {
    console.log('Nueva pauta clicked');
  }

  onDescargaFlow(): void {
    console.log('Descarga Flow clicked');
  }

  onDescargaFlowChart(): void {
    console.log('Descarga FlowChart clicked');
  }

  onAprobarPlan(): void {
    console.log('Aprobar Plan clicked');
  }

  onRegresar(): void {
    console.log('Regresar clicked');
  }
} 