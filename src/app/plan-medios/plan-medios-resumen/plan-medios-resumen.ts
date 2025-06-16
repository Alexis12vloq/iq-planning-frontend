import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  @ViewChild('content') content!: ElementRef;

  periodos: PeriodoPlan[] = PERIODOS_EJEMPLO;
  periodoSeleccionado: PeriodoPlan;
  resumenPlan: ResumenPlan = this.crearPlanEjemplo(); // Inicializar con plan de ejemplo
  displayedColumns: string[] = ['medio', 'semanas', 'total', 'soi'];
  semanasColumnas: string[] = ['L1', 'L7', 'L14', 'L21', 'L28'];
  dataSource: FilaMedio[] = [];

  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const planData = navigation?.extras?.state?.['planData'] as PlanConsultaData;

    if (planData && planData.id) {
      // Cargar el plan completo desde localStorage usando el ID
      const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      const planCompleto = planesLocal.find((plan: any) => plan.id === planData.id);
      
      if (planCompleto) {
        // Inicializar el resumen del plan con los datos reales del localStorage
        this.resumenPlan = {
          numeroPlan: planCompleto.numeroPlan,
          version: Number(planCompleto.version),
          cliente: planCompleto.clienteFueActuacion,
          producto: planCompleto.producto,
          campana: planCompleto.campana,
          fechaInicio: planCompleto.fechaInicio,
          fechaFin: planCompleto.fechaFin,
          periodos: this.periodos
        };
      } else {
        // Fallback si no se encuentra el plan
        this.inicializarPlanEjemplo();
      }
    } else if (planData) {
      // Compatibilidad con navegación anterior (sin ID)
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
      this.inicializarPlanEjemplo();
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
    const planData = {
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana
    };
    
    this.router.navigate(['/plan-medios-nueva-pauta'], { 
      state: { planData } 
    });
  }

  onDescargaFlow(): void {
    console.log('Descarga Flow clicked');
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

  async exportarPDF() {
    try {
      // Mostrar mensaje de carga
      this.snackBar.open('Generando FlowChart...', '', {
        duration: undefined,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });

      const content = this.content.nativeElement;
      const canvas = await html2canvas(content, {
        scale: 2, // Mejor calidad
        useCORS: true,
        logging: false
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Añadir título
      pdf.setFontSize(16);
      pdf.text(`Plan de Medios: ${this.resumenPlan.numeroPlan}`, 15, 15);
      pdf.setFontSize(12);
      pdf.text(`Versión: ${this.resumenPlan.version}`, 15, 22);
      pdf.text(`Cliente: ${this.resumenPlan.cliente}`, 15, 29);
      pdf.text(`Producto: ${this.resumenPlan.producto}`, 15, 36);
      pdf.text(`Campaña: ${this.resumenPlan.campana}`, 15, 43);
      pdf.text(`Período: ${this.periodoSeleccionado.nombre} ${this.periodoSeleccionado.anio}`, 15, 50);

      // Añadir la imagen del contenido
      pdf.addImage(imgData, 'PNG', 0, 60, imgWidth, imgHeight);

      // Guardar el PDF
      pdf.save(`flowchart_${this.resumenPlan.numeroPlan}_v${this.resumenPlan.version}.pdf`);

      // Cerrar mensaje de carga y mostrar mensaje de éxito
      this.snackBar.dismiss();
      this.snackBar.open('FlowChart generado exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error al generar FlowChart:', error);
      this.snackBar.open('Error al generar el FlowChart', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  private crearPlanEjemplo(): ResumenPlan {
    return {
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

  private inicializarPlanEjemplo(): void {
    this.resumenPlan = this.crearPlanEjemplo();
  }
} 