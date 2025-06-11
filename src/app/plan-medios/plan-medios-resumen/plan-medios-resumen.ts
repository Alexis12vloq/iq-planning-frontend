import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ResumenPlan, PeriodoPlan, MedioPlan, PlanConsultaData, PERIODOS_EJEMPLO } from '../models/resumen-plan.model';

interface FilaMedio {
  tipo: 'nombre' | 'salidas' | 'valor';
  medio?: MedioPlan;
  nombre?: string;
  salidas?: number;
  valorNeto?: number;
  semanas?: boolean[];
  soi?: number;
}

@Component({
  selector: 'app-plan-medios-resumen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './plan-medios-resumen.html',
  styleUrls: ['./plan-medios-resumen.scss']
})
export class PlanMediosResumen implements OnInit {
  periodos: PeriodoPlan[] = PERIODOS_EJEMPLO;
  periodoSeleccionado: PeriodoPlan;
  resumenPlan: ResumenPlan;
  displayedColumns: string[] = ['medio', 'semanas', 'total', 'soi'];
  semanasColumnas: string[] = ['L1', 'L7', 'L14', 'L21', 'L28'];
  dataSource: FilaMedio[] = [];

  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const planData = navigation?.extras?.state?.['planData'] as PlanConsultaData;

    if (planData) {
      // Inicializar el resumen del plan con los datos de la consulta
      this.resumenPlan = {
        numeroPlan: planData.numeroPlan,
        version: Number(planData.version),
        cliente: planData.cliente,
        producto: planData.producto,
        campana: planData.campana,
        fechaInicio: planData.fechaInicio,
        fechaFin: planData.fechaFin,
        periodos: this.periodos
      };
    } else {
      // Si no hay datos de consulta, usar datos de ejemplo
      this.resumenPlan = {
        numeroPlan: "0001",
        version: 1,
        cliente: "Cliente Ejemplo",
        producto: "Producto Ejemplo",
        campana: "Campaña Ejemplo",
        fechaInicio: "2024-01-01",
        fechaFin: "2024-12-31",
        periodos: this.periodos
      };
    }

    this.periodoSeleccionado = this.periodos[0];
    this.prepararDataSource();
  }

  ngOnInit(): void {}

  prepararDataSource() {
    const filas: FilaMedio[] = [];
    this.periodoSeleccionado.medios.forEach(medio => {
      // Fila del nombre del medio
      filas.push({
        tipo: 'nombre',
        medio: medio,
        nombre: medio.nombre,
        semanas: medio.semanas,
        soi: medio.soi
      });
      // Fila de salidas
      filas.push({
        tipo: 'salidas',
        salidas: medio.salidas
      });
      // Fila de valor neto
      filas.push({
        tipo: 'valor',
        valorNeto: medio.valorNeto
      });
    });
    this.dataSource = filas;
  }

  obtenerClaseFila(fila: FilaMedio): string {
    switch (fila.tipo) {
      case 'nombre':
        return 'fila-medio';
      case 'salidas':
        return 'fila-salidas';
      case 'valor':
        return 'fila-valor';
      default:
        return '';
    }
  }

  onPeriodoChange(periodo: PeriodoPlan): void {
    this.periodoSeleccionado = periodo;
    this.prepararDataSource();
  }

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
    if (this.resumenPlan.aprobado) {
      this.snackBar.open('Plan aprobado exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } else {
      this.snackBar.open('El plan debe ser revisado. No se puede aprobar en este momento.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  onRegresar(): void {
    this.router.navigate(['/plan-medios-consulta']);
  }
} 