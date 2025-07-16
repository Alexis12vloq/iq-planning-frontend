import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ResumenPlan, PeriodoPlan, MedioPlan, PlanConsultaData, PERIODOS_EJEMPLO } from '../models/resumen-plan.model';
import { PautaLocal } from '../models/pauta-local.model';
import { PlantillaPautaService } from '../services/plantilla-pauta.service';
import { RespuestaPauta } from '../models/plantilla-pauta.model';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface FilaMedio {
  tipo: 'nombre' | 'salidas' | 'valor' | 'encabezado-medio' | 'spots' | 'inversiones';
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
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './plan-medios-resumen.html',
  styleUrls: ['./plan-medios-resumen.scss']
})
export class PlanMediosResumen implements OnInit {
  @ViewChild('content') content!: ElementRef;

  periodos: PeriodoPlan[] = [];
  periodoSeleccionado: PeriodoPlan;
  resumenPlan: ResumenPlan = this.crearPlanEjemplo(); // Inicializar con plan de ejemplo
  displayedColumns: string[] = ['medio', 'semanas', 'total', 'soi'];
  semanasColumnas: string[] = []; // Ahora será dinámico
  semanasConFechas: Array<{nombre: string, fechaInicio: string, fechaFin: string}> = [];
  dataSource: FilaMedio[] = [];
  planId: string | undefined; // Almacenar el ID del plan
  flowChartAsociado: boolean = false; // Flag para saber si ya está asociado al flowchart

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private plantillaService: PlantillaPautaService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const planData = navigation?.extras?.state?.['planData'] as any;

    console.log('📋 === CONSTRUCTOR RESUMEN ===');
    console.log('📋 Plan Data recibido:', planData);

    if (planData && planData.id) {
      // Guardar el ID del plan
      this.planId = planData.id;
      
      // Verificar si viene del FlowChart
      if (planData.fromFlowChart) {
        console.log('✅ Datos vienen del FlowChart, sincronizando...');
        const periodosConPautas = this.cargarPeriodosConPautas(planData.id);
        
        this.resumenPlan = {
          numeroPlan: planData.numeroPlan,
          version: Number(planData.version),
          cliente: planData.cliente,
          producto: planData.producto,
          campana: planData.campana,
          fechaInicio: planData.fechaInicio,
          fechaFin: planData.fechaFin,
          periodos: periodosConPautas
        };
        this.periodos = periodosConPautas;
      }
      // Priorizar datos que vienen del estado de navegación (más actualizados)
      else if (planData.pautas && planData.pautas.length > 0) {
        console.log('✅ Usando pautas del estado de navegación (más actualizadas)');
        const periodosConPautas = this.crearPeriodosConPautasDelEstado(planData);
        
        this.resumenPlan = {
          numeroPlan: planData.numeroPlan,
          version: Number(planData.version),
          cliente: planData.cliente,
          producto: planData.producto,
          campana: planData.campana,
          fechaInicio: planData.fechaInicio,
          fechaFin: planData.fechaFin,
          periodos: periodosConPautas
        };
        this.periodos = periodosConPautas;
      } else {
        console.log('🔄 No hay pautas en el estado, buscando en localStorage');
        // Fallback: Cargar desde localStorage
        const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const planCompleto = planesLocal.find((plan: any) => plan.id === planData.id);
        
        if (planCompleto) {
          const periodosReales = this.cargarPeriodosConPautas(planCompleto.id);
          
          this.resumenPlan = {
            numeroPlan: planCompleto.numeroPlan,
            version: Number(planCompleto.version),
            cliente: planCompleto.clienteFueActuacion || planData.cliente,
            producto: planCompleto.producto,
            campana: planCompleto.campana,
            fechaInicio: planCompleto.fechaInicio,
            fechaFin: planCompleto.fechaFin,
            periodos: periodosReales
          };
          this.periodos = periodosReales;
        } else {
          this.inicializarPlanEjemplo();
        }
      }
    } else if (planData) {
      // Compatibilidad con navegación anterior (sin ID)
      console.log('🔄 Usando datos de navegación sin ID');
      let periodosCompatibles = [];
      
      if (planData.pautas && planData.pautas.length > 0) {
        periodosCompatibles = this.crearPeriodosConPautasDelEstado(planData);
      } else {
        periodosCompatibles = [this.crearPeriodoVacio(planData.fechaInicio, planData.fechaFin)];
      }
      
      this.resumenPlan = {
        numeroPlan: planData.numeroPlan,
        version: Number(planData.version),
        cliente: planData.cliente,
        producto: planData.producto,
        campana: planData.campana,
        fechaInicio: planData.fechaInicio,
        fechaFin: planData.fechaFin,
        periodos: periodosCompatibles
      };
      this.periodos = periodosCompatibles;
    } else {
      // Si no hay datos de consulta, usar datos de ejemplo
      console.log('❌ No hay datos de navegación, usando ejemplo');
      this.inicializarPlanEjemplo();
    }

    this.periodoSeleccionado = this.resumenPlan.periodos[0];
    this.calcularSemanasConFechas();
    this.prepararDataSource();
    
    // Verificar si el flowchart ya está asociado
    if (this.planId) {
      const flowChartFlags = JSON.parse(localStorage.getItem('flowChartFlags') || '{}');
      this.flowChartAsociado = flowChartFlags[this.planId] || false;
    }
    
    console.log('📋 Resumen final configurado:', this.resumenPlan);
    console.log('📋 Período seleccionado:', this.periodoSeleccionado);
    console.log('📊 FlowChart asociado:', this.flowChartAsociado);
  }

  ngOnInit(): void {}

  prepararDataSource() {
    // Agrupar medios por nombre de medio
    const mediosAgrupados = new Map<string, MedioPlan[]>();
    
    this.periodoSeleccionado.medios.forEach(medio => {
      if (!mediosAgrupados.has(medio.nombre)) {
        mediosAgrupados.set(medio.nombre, []);
      }
      mediosAgrupados.get(medio.nombre)!.push(medio);
    });

    const filas: FilaMedio[] = [];
    
    // Iterar sobre cada grupo de medios
    mediosAgrupados.forEach((mediosDelGrupo, nombreMedio) => {
      // Agregar fila de encabezado del medio (solo si hay más de un proveedor)
      if (mediosDelGrupo.length > 1) {
        filas.push({
          tipo: 'encabezado-medio',
          nombre: nombreMedio,
          semanas: [],
          soi: 0
        });
      }

      // Agregar filas para cada proveedor del medio
      mediosDelGrupo.forEach(medio => {
        // Fila del proveedor
        filas.push({
          tipo: 'nombre',
          medio: medio,
          nombre: mediosDelGrupo.length > 1 ? `  ${medio.proveedor || 'Sin proveedor'}` : medio.nombre,
          semanas: medio.semanas,
          soi: medio.soi
        });
        
        // Fila de spots del proveedor
        filas.push({
          tipo: 'spots',
          medio: medio,
          nombre: 'SPOTS'
        });
        
        // Fila de inversiones del proveedor
        filas.push({
          tipo: 'inversiones',
          medio: medio,
          nombre: 'INVERSIONES'
        });
      });
    });

    this.dataSource = filas;
  }

  obtenerClaseFila(fila: FilaMedio): string {
    switch (fila.tipo) {
      case 'encabezado-medio':
        return 'fila-encabezado-medio';
      case 'nombre':
        return 'fila-medio';
      case 'spots':
        return 'fila-spots';
      case 'inversiones':
        return 'fila-inversiones';
      case 'salidas':
        return 'fila-salidas';
      case 'valor':
        return 'fila-valor';
      default:
        return '';
    }
  }

  calcularPorcentaje(valorMedio: number): number {
    // Calcular la suma total de todos los medios
    const totalMedios = this.periodoSeleccionado.medios.reduce((total, medio) => total + medio.valorNeto, 0);
    
    if (totalMedios === 0) {
      return 0;
    }
    
    // Calcular el porcentaje basado en la suma de los medios
    const porcentaje = (valorMedio / totalMedios) * 100;
    
    console.log(`📊 Calculando porcentaje: ${valorMedio} / ${totalMedios} = ${porcentaje.toFixed(1)}%`);
    
    return porcentaje;
  }

  onPeriodoChange(periodo: PeriodoPlan): void {
    this.periodoSeleccionado = periodo;
    this.calcularSemanasConFechas();
    this.prepararDataSource();
  }

  calcularSemanasConFechas(): void {
    this.semanasConFechas = [];
    this.semanasColumnas = [];
    
    const fechaInicio = new Date(this.periodoSeleccionado.fechaInicio);
    const fechaFin = new Date(this.periodoSeleccionado.fechaFin);
    
    // Asegurar que las fechas se parseen correctamente
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);
    
    console.log('📅 Calculando semanas para período:', {
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    });
    
    // Encontrar el primer lunes de la semana que contiene la fecha de inicio
    let inicioSemana = new Date(fechaInicio);
    
    // Si la fecha de inicio no es lunes, ajustar al lunes de esa semana
    const diaSemana = inicioSemana.getDay(); // 0=domingo, 1=lunes, etc.
    if (diaSemana !== 1) {
      // Calcular días hasta el lunes anterior
      let diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1; // Si es domingo (0), retroceder 6 días
      inicioSemana.setDate(inicioSemana.getDate() - diasHastaLunes);
    }
    
    // Si el lunes calculado es anterior a la fecha de inicio del plan, usar la fecha de inicio
    if (inicioSemana < fechaInicio) {
      inicioSemana = new Date(fechaInicio);
    }
    
    let contadorSemana = 1;
    const maxSemanas = 5; // Limitar a máximo 5 semanas
    
    // Generar semanas hasta cubrir todo el período (máximo 5 semanas)
    while (inicioSemana <= fechaFin && contadorSemana <= maxSemanas) {
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6); // Domingo de la misma semana
      
      // Si la fecha fin de la semana supera la fecha fin del período, ajustarla
      if (finSemana > fechaFin) {
        finSemana.setTime(fechaFin.getTime());
      }
      
      // Solo agregar si hay intersección con el período del plan
      if (inicioSemana <= fechaFin && finSemana >= fechaInicio) {
        // Ajustar fechas para que no salgan del rango del plan
        const fechaInicioReal = inicioSemana < fechaInicio ? fechaInicio : inicioSemana;
        const fechaFinReal = finSemana > fechaFin ? fechaFin : finSemana;
        
        this.semanasConFechas.push({
          nombre: `S${contadorSemana}`,
          fechaInicio: this.formatearFecha(fechaInicioReal),
          fechaFin: this.formatearFecha(fechaFinReal)
        });
        
        this.semanasColumnas.push(`S${contadorSemana}`);
        
        console.log(`📅 Semana ${contadorSemana}: ${this.formatearFecha(fechaInicioReal)} - ${this.formatearFecha(fechaFinReal)}`);
        
        contadorSemana++;
      }
      
      // Avanzar al próximo lunes
      inicioSemana.setDate(inicioSemana.getDate() + 7);
    }
    
    console.log('📅 Semanas calculadas:', this.semanasConFechas);
    console.log('📅 Columnas de semanas:', this.semanasColumnas);
  }

  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
  }

  /**
   * Genera un array de spots por semana inicializado en 0
   */
  private generarSpotsPorSemana(): number[] {
    return new Array(this.semanasColumnas.length).fill(0);
  }

  /**
   * Genera un array de semanas boolean inicializado en false
   */
  private generarSemanasBoolean(): boolean[] {
    return new Array(this.semanasColumnas.length).fill(false);
  }

  onNuevaPauta(): void {
    const planData = {
      id: this.planId, // Usar el ID almacenado
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana,
      fechaInicio: this.resumenPlan.fechaInicio,
      fechaFin: this.resumenPlan.fechaFin
    };
    
    console.log('🔄 Navegando a nueva pauta con plan data:', planData);
    
    this.router.navigate(['/plan-medios-nueva-pauta'], { 
      state: { planData } 
    });
  }

  onEditarMedio(medio: any): void {
    const planData = {
      id: this.planId, // Usar el ID almacenado
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana,
      fechaInicio: this.resumenPlan.fechaInicio,
      fechaFin: this.resumenPlan.fechaFin,
      medioSeleccionado: medio.nombre // Pasar el medio seleccionado
    };
    
    console.log('🔄 Navegando a nueva pauta para editar medio:', medio.nombre, 'con plan data:', planData);
    
    this.router.navigate(['/plan-medios-nueva-pauta'], { 
      state: { planData } 
    });
  }

  onAccionMedio(medio: any): void {
    console.log('⚡ Abriendo modal de acciones para medio:', medio);
    
    const dialogRef = this.dialog.open(ModalAccionesMedioComponent, {
      width: '400px',
      data: { 
        medio: medio,
        planId: this.planId
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.accion === 'editar') {
        console.log('✏️ Acción: Editar medio');
        this.editarMedio(medio);
      } else if (result && result.accion === 'eliminar') {
        console.log('🗑️ Acción: Eliminar medio');
        this.eliminarMedio(medio);
      }
    });
  }

  private editarMedio(medio: any): void {
    const dialogRef = this.dialog.open(ModalEditarMedioComponent, {
      width: '500px',
      data: { 
        medio: medio,
        planId: this.planId,
        proveedoresDisponibles: this.obtenerProveedoresPorMedio(medio.nombre)
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        console.log('✅ Medio editado, recargando resumen');
        this.recargarResumen();
      }
    });
  }

  private eliminarMedio(medio: any): void {
    const dialogRef = this.dialog.open(ModalConfirmarEliminacionComponent, {
      width: '400px',
      data: { 
        medio: medio,
        planId: this.planId
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        console.log('✅ Medio eliminado, recargando resumen');
        this.recargarResumen();
      }
    });
  }

  onDescargaFlow(): void {
    console.log('Descarga Flow clicked');
  }

  onAgregarMedio(): void {
    const planData = {
      id: this.planId, // Usar el ID almacenado
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana,
      fechaInicio: this.resumenPlan.fechaInicio,
      fechaFin: this.resumenPlan.fechaFin
    };
    
    console.log('🔄 Abriendo modal para agregar medio:', planData);
    
    const dialogRef = this.dialog.open(ModalAgregarMedioComponent, {
      width: '600px',
      data: { 
        planData,
        numSemanas: this.semanasColumnas.length
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        console.log('✅ Medio agregado, recargando resumen');
        this.recargarResumen();
      }
    });
  }

  onAsociarFlowChart(): void {
    // Sincronizar datos del resumen con el FlowChart
    this.sincronizarResumenConFlowChart();
    
    // Marcar como asociado al flowchart
    this.flowChartAsociado = true;
    
    // Guardar el flag en localStorage
    if (this.planId) {
      const flowChartFlags = JSON.parse(localStorage.getItem('flowChartFlags') || '{}');
      flowChartFlags[this.planId] = true;
      localStorage.setItem('flowChartFlags', JSON.stringify(flowChartFlags));
    }
    
    // Preparar datos para enviar al flowchart
    const datosFlowChart = {
      planId: this.planId,
      planData: this.resumenPlan,
      mediosYProveedores: this.periodoSeleccionado.medios.map(medio => ({
        medio: medio.nombre,
        proveedor: medio.proveedor,
        proveedorId: medio.proveedorId,
        pais: this.resumenPlan.cliente, // Usar cliente como referencia del país
        tarifa: medio.tarifa,
        totalSpots: medio.salidas,
        valorNeto: medio.valorNeto,
        spotsPorSemana: medio.spotsPorSemana || [0, 0, 0, 0, 0],
        semanas: medio.semanas
      }))
    };
    
    // Guardar en storage del flowchart
    const flowChartStorage = JSON.parse(localStorage.getItem('flowChartData') || '[]');
    
    // Agregar o actualizar datos del plan actual
    const existingIndex = flowChartStorage.findIndex((item: any) => item.planId === this.planId);
    if (existingIndex !== -1) {
      flowChartStorage[existingIndex] = datosFlowChart;
    } else {
      flowChartStorage.push(datosFlowChart);
    }
    
    localStorage.setItem('flowChartData', JSON.stringify(flowChartStorage));
    
    // Mostrar confirmación
    this.snackBar.open('FlowChart asociado correctamente', '', { 
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
    
    // Navegar al flowchart
    this.router.navigate(['/flow-chart'], { 
      state: { 
        planData: this.resumenPlan,
        mediosYProveedores: datosFlowChart.mediosYProveedores,
        fromPlanMedios: true
      }
    });
  }

  /**
   * Sincroniza los datos del resumen con el localStorage del FlowChart
   */
  private sincronizarResumenConFlowChart(): void {
    if (!this.planId) return;

    console.log('🔄 Sincronizando datos del Resumen con FlowChart...');
    
    // Obtener pautas existentes del FlowChart
    const pautasFlowChart = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    
    // Convertir medios del resumen al formato del FlowChart
    this.periodoSeleccionado.medios.forEach(medio => {
      // Verificar si ya existe una pauta para este medio
      const pautaExistente = pautasFlowChart.find((pauta: any) => 
        pauta.planId === this.planId && 
        pauta.medio === medio.nombre && 
        pauta.proveedor === medio.proveedor
      );
      
      if (!pautaExistente) {
        // Crear nueva pauta del FlowChart basada en el resumen
        const nuevaPauta = {
          id: `pauta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          planId: this.planId,
          medio: medio.nombre,
          proveedor: medio.proveedor,
          proveedorId: medio.proveedorId,
          valorTotal: medio.valorNeto,
          totalSpots: medio.salidas,
          tarifa: medio.tarifa,
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString(),
          datos: {
            tarifa: medio.tarifa,
            spotsPorSemana: medio.spotsPorSemana || [0, 0, 0, 0, 0],
            valorTotal: medio.valorNeto,
            totalSpots: medio.salidas
          }
        };
        
        pautasFlowChart.push(nuevaPauta);
        console.log('✅ Pauta creada desde resumen:', nuevaPauta);
      } else {
        // Actualizar pauta existente con datos del resumen
        pautaExistente.valorTotal = medio.valorNeto;
        pautaExistente.totalSpots = medio.salidas;
        pautaExistente.tarifa = medio.tarifa;
        pautaExistente.fechaModificacion = new Date().toISOString();
        
        if (pautaExistente.datos) {
          pautaExistente.datos.tarifa = medio.tarifa;
          pautaExistente.datos.spotsPorSemana = medio.spotsPorSemana || [0, 0, 0, 0, 0];
          pautaExistente.datos.valorTotal = medio.valorNeto;
          pautaExistente.datos.totalSpots = medio.salidas;
        }
        
        console.log('✅ Pauta actualizada desde resumen:', pautaExistente);
      }
    });
    
    // Guardar las pautas actualizadas
    localStorage.setItem('respuestasPautas', JSON.stringify(pautasFlowChart));
    
    console.log('💾 Datos sincronizados con FlowChart');
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
    // Fechas de ejemplo dinámicas
    const fechaInicio = "2024-01-01";
    const fechaFin = "2024-12-31";
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);

    // Crear un período vacío para el plan de ejemplo
    const periodoVacio: PeriodoPlan = {
      id: '1',
      nombre: periodoInfo.nombre,
      anio: periodoInfo.anio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      medios: [], // Sin medios
      totalInversionNeta: 0,
      iva: 0,
      totalInversion: 0
    };

    return {
      numeroPlan: "0001",
      version: 1,
      cliente: "Cliente Ejemplo",
      producto: "Producto Ejemplo",
      campana: "Campaña Ejemplo",
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      periodos: [periodoVacio]
    };
  }

  private inicializarPlanEjemplo(): void {
    this.resumenPlan = this.crearPlanEjemplo();
  }

  private cargarPeriodosConPautas(planId: string): PeriodoPlan[] {
    // Cargar pautas del plan desde localStorage usando la clave correcta
    const respuestasPautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasDelPlan = respuestasPautas.filter((pauta: any) => pauta.planId === planId);

    console.log('Pautas encontradas para el plan:', pautasDelPlan);

    // Obtener las fechas del plan para calcular el período
    const planCompleto = JSON.parse(localStorage.getItem('planesMedios') || '[]')
      .find((plan: any) => plan.id === planId);
    
    const fechaInicio = planCompleto?.fechaInicio || this.resumenPlan.fechaInicio;
    const fechaFin = planCompleto?.fechaFin || this.resumenPlan.fechaFin;
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);

    // Si no hay pautas, devolver período vacío con fechas reales
    if (pautasDelPlan.length === 0) {
      return [{
        id: '1',
        nombre: periodoInfo.nombre,
        anio: periodoInfo.anio,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        medios: [], // Sin medios cuando no hay pautas
        totalInversionNeta: 0,
        iva: 0,
        totalInversion: 0
      }];
    }

    // Agrupar pautas por medio y proveedor
    const mediosMap = new Map<string, MedioPlan>();
    
    pautasDelPlan.forEach((respuestaPauta: any) => {
      const medio = respuestaPauta.medio;
      const proveedor = respuestaPauta.proveedor || 'Sin proveedor';
      const proveedorId = respuestaPauta.proveedorId;
      const claveAgrupacion = `${medio}_${proveedor}`;
      const valorTotal = Number(respuestaPauta.valorTotal) || 0;
      const totalSpots = Number(respuestaPauta.totalSpots) || 1;
      const tarifa = Number(respuestaPauta.datos?.tarifa) || (valorTotal / totalSpots) || 0;
      
      // Calcular semanas basado en días seleccionados del calendario
      let semanasBoolean = this.generarSemanasBoolean(); // Dinámico basado en número de semanas
      
      if (respuestaPauta.diasSeleccionados && respuestaPauta.diasSeleccionados.length > 0) {
        // Si tiene días específicos seleccionados, calcular las semanas correspondientes
        const diasSeleccionados = respuestaPauta.diasSeleccionados;
        const fechaInicioPlan = new Date(fechaInicio);
        
        diasSeleccionados.forEach((fechaStr: string) => {
          const fechaDia = new Date(fechaStr);
          const diferenciaDias = Math.floor((fechaDia.getTime() - fechaInicioPlan.getTime()) / (1000 * 60 * 60 * 24));
          const semanaIndex = Math.floor(diferenciaDias / 7);
          
          // Mapear a las semanas disponibles
          if (semanaIndex >= 0 && semanaIndex < semanasBoolean.length) {
            semanasBoolean[semanaIndex] = true;
          } else if (semanaIndex >= semanasBoolean.length) {
            // Para semanas posteriores, marcar la última disponible
            semanasBoolean[semanasBoolean.length - 1] = true;
          }
        });
      } else if (respuestaPauta.semanas) {
        // Fallback al sistema anterior de semanas
        const semanas = respuestaPauta.semanas || [];
        semanasBoolean = this.semanasColumnas.map(codigo => 
          semanas.includes(codigo)
        );
      }
      
      // Cargar spots guardados desde localStorage
      const spotsGuardados = respuestaPauta.datos?.spotsPorSemana || this.generarSpotsPorSemana();
      const totalSpotsGuardados = spotsGuardados.reduce((total: number, spots: number) => total + spots, 0);
      
      if (mediosMap.has(claveAgrupacion)) {
        // Si el medio y proveedor ya existen, sumar los valores
        const medioExistente = mediosMap.get(claveAgrupacion)!;
        medioExistente.salidas = Math.max(medioExistente.salidas, totalSpotsGuardados); // Usar spots guardados
        medioExistente.valorNeto = Number(medioExistente.valorNeto) + Number(valorTotal);
        // Para semanas, hacer OR lógico (si cualquier pauta tiene true, el resultado es true)
        medioExistente.semanas = medioExistente.semanas.map((valor, index) => 
          valor || semanasBoolean[index]
        );
        // Calcular SOI promedio
        medioExistente.soi = medioExistente.salidas > 0 ? Math.round(medioExistente.valorNeto / medioExistente.salidas) : 0;
        // Cargar spots guardados
        medioExistente.spotsPorSemana = spotsGuardados;
      } else {
        // Crear nuevo medio con proveedor
        mediosMap.set(claveAgrupacion, {
          nombre: medio,
          proveedor: proveedor,
          proveedorId: proveedorId,
          salidas: totalSpotsGuardados, // Usar spots guardados
          valorNeto: Number(valorTotal),
          soi: totalSpotsGuardados > 0 ? Math.round(Number(valorTotal) / totalSpotsGuardados) : 0,
          semanas: semanasBoolean,
          tarifa: tarifa,
          spotsPorSemana: spotsGuardados // Cargar spots guardados
        });
      }
    });

    // Convertir map a array
    const medios = Array.from(mediosMap.values());
    
    // Recalcular inversiones basadas en spots cargados
    medios.forEach(medio => {
      if (medio.tarifa && medio.salidas > 0) {
        medio.valorNeto = medio.salidas * medio.tarifa;
      }
    });
    
    // Calcular totales
    const totalInversionNeta = medios.reduce((total, medio) => total + medio.valorNeto, 0);
    const iva = Math.round(totalInversionNeta * 0.19); // CAMBIO: Usar 19% como especificado
    const totalInversion = totalInversionNeta + iva;

    return [{
      id: '1',
      nombre: periodoInfo.nombre,
      anio: periodoInfo.anio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      medios: medios,
      totalInversionNeta: totalInversionNeta,
      iva: iva,
      totalInversion: totalInversion
    }];
  }

  private crearPeriodosConPautasDelEstado(planData: any): PeriodoPlan[] {
    console.log('🔄 Creando períodos con pautas del estado:', planData.pautas);
    
    const fechaInicio = planData.fechaInicio;
    const fechaFin = planData.fechaFin;
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);

    // Agrupar pautas por medio y proveedor
    const mediosMap = new Map<string, MedioPlan>();
    
    planData.pautas.forEach((pautaResumen: any) => {
      const medio = pautaResumen.medio;
      const proveedor = pautaResumen.proveedor || 'Sin proveedor';
      const proveedorId = pautaResumen.proveedorId;
      const claveAgrupacion = `${medio}_${proveedor}`;
      const valorTotal = Number(pautaResumen.valorTotal) || 0;
      const totalSpots = Number(pautaResumen.totalSpots) || 1;
      const tarifa = Number(pautaResumen.datos?.tarifa) || (valorTotal / totalSpots) || 0;
      
      // Para pautas del estado, usar semanas por defecto (se pueden mejorar después)
      const semanasBoolean = this.generarSemanasBoolean().map(() => true); // Todas las semanas activas por defecto
      
      // Cargar spots guardados desde localStorage  
      const spotsGuardados = pautaResumen.datos?.spotsPorSemana || this.generarSpotsPorSemana();
      const totalSpotsGuardados = spotsGuardados.reduce((total: number, spots: number) => total + spots, 0);
      
      if (mediosMap.has(claveAgrupacion)) {
        // Si el medio y proveedor ya existen, sumar los valores
        const medioExistente = mediosMap.get(claveAgrupacion)!;
        medioExistente.salidas = Math.max(medioExistente.salidas, totalSpotsGuardados); // Usar spots guardados
        medioExistente.valorNeto = Number(medioExistente.valorNeto) + Number(valorTotal);
        medioExistente.soi = medioExistente.salidas > 0 ? Math.round(medioExistente.valorNeto / medioExistente.salidas) : 0;
        // Cargar spots guardados
        medioExistente.spotsPorSemana = spotsGuardados;
      } else {
        // Crear nuevo medio con proveedor
        mediosMap.set(claveAgrupacion, {
          nombre: medio,
          proveedor: proveedor,
          proveedorId: proveedorId,
          salidas: totalSpotsGuardados, // Usar spots guardados
          valorNeto: Number(valorTotal),
          soi: totalSpotsGuardados > 0 ? Math.round(Number(valorTotal) / totalSpotsGuardados) : 0,
          semanas: semanasBoolean,
          tarifa: tarifa,
          spotsPorSemana: spotsGuardados // Cargar spots guardados
        });
      }
    });

    // Convertir map a array
    const medios = Array.from(mediosMap.values());
    
    // Recalcular inversiones basadas en spots cargados
    medios.forEach(medio => {
      if (medio.tarifa && medio.salidas > 0) {
        medio.valorNeto = medio.salidas * medio.tarifa;
      }
    });
    
    // CORRECCIÓN: Calcular totales SIEMPRE desde la suma de medios (no usar presupuestoTotal)
    const totalInversionNeta = medios.reduce((total, medio) => {
      const valorNumerico = Number(medio.valorNeto);
      console.log(`💰 Sumando medio ${medio.nombre}: ${valorNumerico} (tipo: ${typeof valorNumerico})`);
      return Number(total) + valorNumerico;
    }, 0);
    
    const iva = Math.round(Number(totalInversionNeta) * 0.19);
    const totalInversion = Number(totalInversionNeta) + Number(iva);

    console.log('✅ Medios creados del estado:', medios);
    console.log('✅ Total inversión neta calculado:', totalInversionNeta, '(tipo:', typeof totalInversionNeta, ')');
    console.log('✅ IVA 19%:', iva, '(tipo:', typeof iva, ')');
    console.log('✅ Total inversión final:', totalInversion, '(tipo:', typeof totalInversion, ')');

    return [{
      id: '1',
      nombre: periodoInfo.nombre,
      anio: periodoInfo.anio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      medios: medios,
      totalInversionNeta: totalInversionNeta,
      iva: iva,
      totalInversion: totalInversion
    }];
  }

  private crearPeriodoVacio(fechaInicio: string, fechaFin: string): PeriodoPlan {
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);
    
    return {
      id: '1',
      nombre: periodoInfo.nombre,
      anio: periodoInfo.anio,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      medios: [],
      totalInversionNeta: 0,
      iva: 0,
      totalInversion: 0
    };
  }

  private calcularPeriodo(fechaInicio: string, fechaFin: string): { nombre: string, anio: number } {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Asegurar que las fechas se parseen correctamente
    const fechaIni = new Date(fechaInicio + 'T00:00:00.000Z');
    const fechaFinal = new Date(fechaFin + 'T00:00:00.000Z');
    
    const mesInicio = fechaIni.getUTCMonth(); // 0-11
    const mesFin = fechaFinal.getUTCMonth(); // 0-11
    const anioInicio = fechaIni.getUTCFullYear();
    const anioFin = fechaFinal.getUTCFullYear();

    // Debug: Agregar logs temporales
    console.log('Calculando período:', {
      fechaInicio,
      fechaFin,
      mesInicio,
      mesFin,
      mesInicioNombre: meses[mesInicio],
      mesFinNombre: meses[mesFin],
      sonIguales: mesInicio === mesFin
    });

    // Si es el mismo año
    if (anioInicio === anioFin) {
      if (mesInicio === mesFin) {
        // Mismo mes
        return {
          nombre: `${meses[mesInicio]}`,
          anio: anioInicio
        };
      } else {
        // Diferentes meses del mismo año
        return {
          nombre: `${meses[mesInicio]}-${meses[mesFin]}`,
          anio: anioInicio
        };
      }
    } else {
      // Diferentes años
      return {
        nombre: `${meses[mesInicio]} ${anioInicio} - ${meses[mesFin]} ${anioFin}`,
        anio: anioInicio // Usar el año de inicio como referencia
      };
    }
  }

  // Método para recargar el resumen después de agregar un medio
  recargarResumen(): void {
    if (this.planId) {
      // Recargar las pautas del plan
      const periodosReales = this.cargarPeriodosConPautas(this.planId);
      this.resumenPlan.periodos = periodosReales;
      this.periodos = periodosReales;
      this.periodoSeleccionado = periodosReales[0];
      this.calcularSemanasConFechas();
      this.prepararDataSource();
      this.actualizarTotalesPeriodo(); // Asegurar que los totales se recalculen
      console.log('✅ Resumen recargado con spots guardados:', this.periodoSeleccionado.medios);
    }
  }

  // Método para actualizar spots y recalcular inversiones
  onSpotsChange(medio: MedioPlan, semanaIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const nuevoSpots = parseInt(target.value) || 0;
    
    // Inicializar spotsPorSemana si no existe
    if (!medio.spotsPorSemana) {
      medio.spotsPorSemana = this.generarSpotsPorSemana();
    }
    
    // Actualizar spots de la semana específica
    medio.spotsPorSemana[semanaIndex] = nuevoSpots;
    
    // Recalcular salidas totales
    medio.salidas = medio.spotsPorSemana.reduce((total, spots) => total + spots, 0);
    
    // Recalcular inversiones totales
    if (medio.tarifa) {
      medio.valorNeto = medio.salidas * medio.tarifa;
    }
    
    // Recalcular SOI
    medio.soi = medio.salidas > 0 ? Math.round(medio.valorNeto / medio.salidas) : 0;
    
    // Actualizar totales del período
    this.actualizarTotalesPeriodo();
    
    // Guardar cambios en localStorage
    this.guardarCambiosEnLocalStorage();
    
    // Mostrar confirmación visual
    this.snackBar.open(`💾 Guardado: ${medio.nombre} - ${nuevoSpots} spots`, '', { 
      duration: 1000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
    
    console.log(`✅ Spots actualizados para ${medio.nombre} semana ${semanaIndex + 1}: ${nuevoSpots}`);
    console.log(`✅ Nueva inversión total: ${medio.valorNeto}`);
  }

  // Método para calcular total de spots
  calcularTotalSpots(medio: MedioPlan): number {
    if (!medio.spotsPorSemana) {
      return medio.salidas || 0;
    }
    return medio.spotsPorSemana.reduce((total, spots) => total + spots, 0);
  }

  // Método para calcular inversión por semana
  calcularInversionSemana(medio: MedioPlan, semanaIndex: number): number {
    if (!medio.spotsPorSemana || !medio.tarifa) {
      return 0;
    }
    const spotsEnSemana = medio.spotsPorSemana[semanaIndex] || 0;
    return spotsEnSemana * medio.tarifa;
  }

  // Método para actualizar totales del período
  private actualizarTotalesPeriodo(): void {
    const totalInversionNeta = this.periodoSeleccionado.medios.reduce((total, medio) => total + medio.valorNeto, 0);
    const iva = Math.round(totalInversionNeta * 0.19);
    const totalInversion = totalInversionNeta + iva;
    
    this.periodoSeleccionado.totalInversionNeta = totalInversionNeta;
    this.periodoSeleccionado.iva = iva;
    this.periodoSeleccionado.totalInversion = totalInversion;
    
    // Actualizar el dataSource para reflejar los cambios
    this.prepararDataSource();
  }

  // Método para guardar cambios en localStorage
  private guardarCambiosEnLocalStorage(): void {
    if (!this.planId) return;
    
    // Obtener pautas existentes
    const respuestasPautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    
    // Actualizar pautas del plan actual
    this.periodoSeleccionado.medios.forEach(medio => {
      const claveAgrupacion = `${medio.nombre}_${medio.proveedor}`;
      
      // Buscar y actualizar la pauta correspondiente
      const pautaIndex = respuestasPautas.findIndex((pauta: any) => 
        pauta.planId === this.planId && 
        pauta.medio === medio.nombre && 
        pauta.proveedor === medio.proveedor
      );
      
      if (pautaIndex !== -1) {
        respuestasPautas[pautaIndex].totalSpots = medio.salidas;
        respuestasPautas[pautaIndex].valorTotal = medio.valorNeto;
        respuestasPautas[pautaIndex].valorNeto = medio.valorNeto;
        if (medio.tarifa) {
          respuestasPautas[pautaIndex].datos = respuestasPautas[pautaIndex].datos || {};
          respuestasPautas[pautaIndex].datos.tarifa = medio.tarifa;
        }
        // Guardar distribución de spots por semana
        if (medio.spotsPorSemana) {
          respuestasPautas[pautaIndex].datos = respuestasPautas[pautaIndex].datos || {};
          respuestasPautas[pautaIndex].datos.spotsPorSemana = medio.spotsPorSemana;
        }
      }
    });
    
    // Guardar en localStorage
    localStorage.setItem('respuestasPautas', JSON.stringify(respuestasPautas));
    
    console.log('💾 Cambios guardados en localStorage');
  }

  private distribuirSpotsEnSemanas(totalSpots: number, semanasBoolean: boolean[]): number[] {
    // Inicializar todos los spots en 0 por defecto
    const spotsPorSemana: number[] = this.generarSpotsPorSemana();
    
    // Solo distribuir si hay spots especificados y mayor a 0
    if (totalSpots > 0) {
      let spotsRestantes = totalSpots;
      const numSemanas = semanasBoolean.length;

      for (let i = 0; i < numSemanas; i++) {
        const spotsParaSemana = Math.floor(spotsRestantes / (numSemanas - i)); // Distribuir proporcionalmente
        spotsPorSemana[i] = spotsParaSemana;
        spotsRestantes -= spotsParaSemana;
      }

      // Asegurar que los spots restantes se distribuyan en la última semana
      if (numSemanas > 0) {
        spotsPorSemana[numSemanas - 1] += spotsRestantes;
      }
    }

    return spotsPorSemana;
  }

  private obtenerProveedoresPorMedio(medio: string): any[] {
    return this.plantillaService.obtenerProveedoresPorMedio(medio);
  }
}

// Componente Modal para Agregar Medio
@Component({
  selector: 'app-modal-agregar-medio',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon>add_circle</mat-icon>
        Agregar Medio - Plan {{ data.planData?.numeroPlan }}
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <!-- Información del Plan -->
      <div class="plan-info">
        <div class="info-item">
          <span class="label">Cliente:</span>
          <span class="value">{{ data.planData?.cliente }}</span>
        </div>
        <div class="info-item">
          <span class="label">Producto:</span>
          <span class="value">{{ data.planData?.producto }}</span>
        </div>
        <div class="info-item">
          <span class="label">Campaña:</span>
          <span class="value">{{ data.planData?.campana }}</span>
        </div>
      </div>

      <!-- Alerta de medios existentes -->
      <div class="medios-existentes" *ngIf="mediosExistentes.length > 0">
        <h4>Medios ya agregados al plan:</h4>
        <div class="medio-existente" *ngFor="let medioExistente of mediosExistentes">
          <mat-icon>info</mat-icon>
          <span>{{ medioExistente.medio }} - {{ medioExistente.proveedor }} (Tarifa: {{ medioExistente.tarifa | currency:'USD':'symbol':'1.2-2' }})</span>
        </div>
      </div>

      <!-- Formulario Simplificado -->
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Nuevo Medio</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="medioForm">
            <mat-form-field class="full-width">
              <mat-label>Seleccionar Medio</mat-label>
              <mat-select formControlName="medio" (selectionChange)="onMedioChange($event.value)">
                <mat-option *ngFor="let medio of mediosDisponibles" [value]="medio">
                  {{ medio }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field class="full-width" *ngIf="medioForm.get('medio')?.value">
              <mat-label>Seleccionar Proveedor</mat-label>
              <mat-select formControlName="proveedor">
                <mat-option *ngFor="let proveedor of proveedoresFiltrados" [value]="proveedor.id">
                  {{ proveedor.VENDOR }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="proveedoresFiltrados.length === 0 && proveedoresDisponibles.length > 0">
                Todos los proveedores de este medio ya están agregados
              </mat-hint>
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>Tarifa</mat-label>
              <input matInput type="number" formControlName="tarifa" step="0.01">
            </mat-form-field>

            <!-- Mensaje de validación de duplicado -->
            <div class="validation-message" *ngIf="existeCombinacion">
              <mat-icon color="warn">warning</mat-icon>
              <span>Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan</span>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="!medioForm.valid || existeCombinacion"
        (click)="guardarMedio()">
        <mat-icon>save</mat-icon>
        Guardar Medio
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-content {
      padding: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .plan-info {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .value {
      font-size: 14px;
      color: #333;
    }

    .medios-existentes {
      margin-bottom: 16px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    }

    .medios-existentes h4 {
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .medio-existente {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 13px;
      color: #333;
    }

    .medio-existente mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #2196f3;
    }

    .form-card {
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .validation-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 14px;
      margin-top: 8px;
    }

    .validation-message mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .modal-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class ModalAgregarMedioComponent implements OnInit {
  medioForm!: FormGroup;
  mediosDisponibles = ['TV NAL', 'Radio', 'Digital', 'Prensa', 'OOH'];
  proveedoresDisponibles: any[] = [];
  proveedoresFiltrados: any[] = [];
  mediosExistentes: any[] = [];
  existeCombinacion: boolean = false;
  numSemanas: number = 5; // Por defecto 5 semanas

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaPautaService,
    private dialogRef: MatDialogRef<ModalAgregarMedioComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.medioForm = this.fb.group({
      medio: [''],
      proveedor: [''],
      tarifa: [0]
    });
  }

  ngOnInit(): void {
    // Inicializar número de semanas desde los datos recibidos
    if (this.data.numSemanas) {
      this.numSemanas = this.data.numSemanas;
    }
    
    // Cargar medios existentes del plan
    this.cargarMediosExistentes();
    
    // Suscribirse a cambios en el formulario para validar duplicados
    this.medioForm.valueChanges.subscribe(() => {
      this.validarCombinacionDuplicada();
    });
  }

  /**
   * Genera un array de spots por semana inicializado en 0
   */
  private generarSpotsPorSemana(): number[] {
    return new Array(this.numSemanas).fill(0);
  }

  private cargarMediosExistentes(): void {
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    this.mediosExistentes = pautas
      .filter((pauta: any) => pauta.planId === this.data.planData.id)
      .map((pauta: any) => ({
        medio: pauta.medio,
        proveedor: pauta.proveedor,
        tarifa: pauta.datos?.tarifa || 0
      }));
    
    console.log('📋 Medios existentes cargados:', this.mediosExistentes);
  }

  onMedioChange(medio: string): void {
    if (medio) {
      this.proveedoresDisponibles = this.plantillaService.obtenerProveedoresPorMedio(medio);
      this.filtrarProveedoresDisponibles(medio);
      this.medioForm.patchValue({ proveedor: '', tarifa: 0 });
    }
  }

  private filtrarProveedoresDisponibles(medio: string): void {
    // Obtener proveedores ya usados para este medio
    const proveedoresUsados = this.mediosExistentes
      .filter(me => me.medio === medio)
      .map(me => me.proveedor);
    
    // Filtrar proveedores disponibles excluyendo los ya usados
    this.proveedoresFiltrados = this.proveedoresDisponibles.filter(proveedor => 
      !proveedoresUsados.includes(proveedor.VENDOR)
    );
    
    console.log('🔍 Proveedores filtrados para', medio, ':', this.proveedoresFiltrados);
  }

  private validarCombinacionDuplicada(): void {
    const valores = this.medioForm.value;
    
    if (valores.medio && valores.proveedor && valores.tarifa > 0) {
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      
      if (proveedorSeleccionado) {
        // Verificar si existe la combinación exacta
        this.existeCombinacion = this.mediosExistentes.some(me => 
          me.medio === valores.medio && 
          me.proveedor === proveedorSeleccionado.VENDOR && 
          Math.abs(me.tarifa - valores.tarifa) < 0.01 // Comparación con tolerancia para decimales
        );
        
        console.log('🔍 Validando combinación:', {
          medio: valores.medio,
          proveedor: proveedorSeleccionado.VENDOR,
          tarifa: valores.tarifa,
          existe: this.existeCombinacion
        });
      }
    } else {
      this.existeCombinacion = false;
    }
  }

  guardarMedio(): void {
    if (this.medioForm.valid && !this.existeCombinacion) {
      const valores = this.medioForm.value;
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      
      // Verificar una vez más antes de guardar
      const combinacionExiste = this.mediosExistentes.some(me => 
        me.medio === valores.medio && 
        me.proveedor === proveedorSeleccionado?.VENDOR && 
        Math.abs(me.tarifa - valores.tarifa) < 0.01
      );
      
      if (combinacionExiste) {
        this.snackBar.open('❌ Esta combinación de Medio-Proveedor-Tarifa ya existe', '', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      // Crear una pauta simple para almacenar el medio
      const nuevaPauta: RespuestaPauta = {
        id: `pauta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        planId: this.data.planData.id,
        plantillaId: 'simple',
        paisFacturacion: 'Perú',
        medio: valores.medio,
        proveedor: proveedorSeleccionado ? proveedorSeleccionado.VENDOR : 'Sin proveedor',
        proveedorId: valores.proveedor,
        datos: { 
          tarifa: Number(valores.tarifa),
          spotsPorSemana: this.generarSpotsPorSemana() // Inicializar spots por semana dinámicamente
        },
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        valorTotal: Number(valores.tarifa), // Inicialmente el valor es igual a la tarifa (1 spot)
        valorNeto: Number(valores.tarifa),
        totalSpots: 1, // Inicialmente 1 spot
        diasSeleccionados: [],
        totalDiasSeleccionados: 0
      };

      // Guardar en localStorage
      const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
      pautas.push(nuevaPauta);
      localStorage.setItem('respuestasPautas', JSON.stringify(pautas));

      this.snackBar.open('✅ Medio agregado correctamente', '', { 
        duration: 2000,
        panelClass: ['success-snackbar']
      });
      
      console.log('✅ Nuevo medio guardado:', nuevaPauta);
      this.dialogRef.close({ shouldRefresh: true });
    } else if (this.existeCombinacion) {
      this.snackBar.open('❌ Esta combinación ya existe en el plan', '', { 
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }
} 

// Componente Modal para Seleccionar Acción (Eliminar o Editar)
@Component({
  selector: 'app-modal-acciones-medio',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon>settings</mat-icon>
        Acciones para: {{ data.medio.nombre }}
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="medio-info">
        <div class="info-item">
          <span class="label">Medio:</span>
          <span class="value">{{ data.medio.nombre }}</span>
        </div>
        <div class="info-item">
          <span class="label">Proveedor:</span>
          <span class="value">{{ data.medio.proveedor }}</span>
        </div>
        <div class="info-item">
          <span class="label">Valor Total:</span>
          <span class="value">{{ data.medio.valorNeto | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <div class="accion-mensaje">
        <p>¿Qué acción deseas realizar con este medio?</p>
      </div>

      <div class="acciones-container">
        <button 
          mat-raised-button 
          color="primary" 
          class="accion-button editar-button"
          (click)="seleccionarAccion('editar')">
          <mat-icon>edit</mat-icon>
          Editar Medio
        </button>
        
        <button 
          mat-raised-button 
          color="warn" 
          class="accion-button eliminar-button"
          (click)="seleccionarAccion('eliminar')">
          <mat-icon>delete</mat-icon>
          Eliminar Medio
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-content {
      padding: 24px;
      text-align: center;
      min-width: 350px;
    }

    .medio-info {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-bottom: 24px;
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }

    .accion-mensaje {
      margin-bottom: 28px;
      
      p {
        font-size: 16px;
        color: #444;
        margin: 0;
        font-weight: 500;
      }
    }

    .acciones-container {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-bottom: 20px;
    }

    .accion-button {
      min-width: 160px;
      height: 36px;
      font-size: 13px;
      font-weight: 500;
      text-transform: none;
      border-radius: 4px;
      border: none;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: none;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      
      &:hover {
        box-shadow: none;
      }
    }

    .editar-button {
      background-color: #e3f2fd;
      color: #1565c0;
      
      &:hover {
        background-color: #bbdefb;
      }
    }

    .eliminar-button {
      background-color: #e3f2fd;
      color: #1565c0;
      
      &:hover {
        background-color: #bbdefb;
      }
    }

    .modal-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: center;
      gap: 8px;
    }
  `]
})
export class ModalAccionesMedioComponent {
  constructor(
    private dialogRef: MatDialogRef<ModalAccionesMedioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  seleccionarAccion(accion: 'editar' | 'eliminar'): void {
    this.dialogRef.close({ accion });
  }
}

// Componente Modal para Editar Medio
@Component({
  selector: 'app-modal-editar-medio',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon>edit</mat-icon>
        Editar Medio: {{ data.medio.nombre }}
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="medio-info">
        <div class="info-item">
          <span class="label">Medio:</span>
          <span class="value">{{ data.medio.nombre }}</span>
        </div>
        <div class="info-item">
          <span class="label">Proveedor Actual:</span>
          <span class="value">{{ data.medio.proveedor }}</span>
        </div>
        <div class="info-item">
          <span class="label">Tarifa Actual:</span>
          <span class="value">{{ data.medio.tarifa | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <form [formGroup]="editarForm">
        <mat-form-field class="full-width">
          <mat-label>Proveedor</mat-label>
          <mat-select formControlName="proveedor">
            <mat-option *ngFor="let proveedor of proveedoresDisponibles" [value]="proveedor.id">
              {{ proveedor.VENDOR }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Tarifa</mat-label>
          <input matInput type="number" formControlName="tarifa" step="0.01">
        </mat-form-field>

        <div class="validation-message" *ngIf="existeCombinacion">
          <mat-icon color="warn">warning</mat-icon>
          <span>Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan</span>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="!editarForm.valid || existeCombinacion"
        (click)="guardarCambios()">
        <mat-icon>save</mat-icon>
        Guardar Cambios
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-content {
      padding: 16px;
      min-height: 200px;
    }

    .medio-info {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .value {
      font-size: 14px;
      color: #333;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .validation-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 14px;
      margin-top: 8px;
    }

    .modal-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class ModalEditarMedioComponent implements OnInit {
  editarForm!: FormGroup;
  proveedoresDisponibles: any[] = [];
  existeCombinacion: boolean = false;
  mediosExistentes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalEditarMedioComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.editarForm = this.fb.group({
      proveedor: [data.medio.proveedorId || ''],
      tarifa: [data.medio.tarifa || 0]
    });
  }

  ngOnInit(): void {
    this.proveedoresDisponibles = this.data.proveedoresDisponibles || [];
    this.cargarMediosExistentes();
    
    // Suscribirse a cambios en el formulario para validar duplicados
    this.editarForm.valueChanges.subscribe(() => {
      this.validarCombinacionDuplicada();
    });
  }

  private cargarMediosExistentes(): void {
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    this.mediosExistentes = pautas
      .filter((pauta: any) => pauta.planId === this.data.planId)
      .map((pauta: any) => ({
        medio: pauta.medio,
        proveedor: pauta.proveedor,
        tarifa: pauta.datos?.tarifa || 0
      }));
  }

  private validarCombinacionDuplicada(): void {
    const valores = this.editarForm.value;
    
    if (valores.proveedor && valores.tarifa > 0) {
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      
      if (proveedorSeleccionado) {
        // Verificar si existe la combinación exacta (excluyendo el medio actual)
        this.existeCombinacion = this.mediosExistentes.some(me => 
          me.medio === this.data.medio.nombre && 
          me.proveedor === proveedorSeleccionado.VENDOR && 
          Math.abs(me.tarifa - valores.tarifa) < 0.01 &&
          // Excluir el medio actual de la validación
          !(me.proveedor === this.data.medio.proveedor && me.tarifa === this.data.medio.tarifa)
        );
      }
    } else {
      this.existeCombinacion = false;
    }
  }

  guardarCambios(): void {
    if (this.editarForm.valid && !this.existeCombinacion) {
      const valores = this.editarForm.value;
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      
      // Actualizar pauta en localStorage
      const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
      const pautaIndex = pautas.findIndex((pauta: any) => 
        pauta.planId === this.data.planId && 
        pauta.medio === this.data.medio.nombre && 
        pauta.proveedor === this.data.medio.proveedor
      );
      
      if (pautaIndex !== -1) {
        // Actualizar proveedor y tarifa
        pautas[pautaIndex].proveedor = proveedorSeleccionado ? proveedorSeleccionado.VENDOR : this.data.medio.proveedor;
        pautas[pautaIndex].proveedorId = valores.proveedor;
        pautas[pautaIndex].datos = pautas[pautaIndex].datos || {};
        pautas[pautaIndex].datos.tarifa = Number(valores.tarifa);
        
        // Recalcular valores basados en la nueva tarifa
        const totalSpots = pautas[pautaIndex].totalSpots || 1;
        pautas[pautaIndex].valorTotal = totalSpots * Number(valores.tarifa);
        pautas[pautaIndex].valorNeto = totalSpots * Number(valores.tarifa);
        pautas[pautaIndex].fechaModificacion = new Date().toISOString();
        
        localStorage.setItem('respuestasPautas', JSON.stringify(pautas));
        
        this.snackBar.open('✅ Medio actualizado correctamente', '', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        
        this.dialogRef.close({ shouldRefresh: true });
      } else {
        this.snackBar.open('❌ Error: No se pudo encontrar el medio para actualizar', '', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
}

// Componente Modal para Confirmar Eliminación
@Component({
  selector: 'app-modal-confirmar-eliminacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon color="warn">warning</mat-icon>
        Confirmar Eliminación
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="warning-message">
        <mat-icon color="warn">delete_forever</mat-icon>
        <p>¿Estás seguro que deseas eliminar este medio del plan?</p>
      </div>
      
      <div class="medio-info">
        <div class="info-item">
          <span class="label">Medio:</span>
          <span class="value">{{ data.medio.nombre }}</span>
        </div>
        <div class="info-item">
          <span class="label">Proveedor:</span>
          <span class="value">{{ data.medio.proveedor }}</span>
        </div>
        <div class="info-item">
          <span class="label">Valor Total:</span>
          <span class="value">{{ data.medio.valorNeto | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <div class="danger-notice">
        <mat-icon color="warn">info</mat-icon>
        <span>Esta acción no se puede deshacer.</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button 
        mat-raised-button 
        color="warn" 
        (click)="confirmarEliminacion()">
        <mat-icon>delete</mat-icon>
        Eliminar Medio
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-content {
      padding: 16px;
    }

    .warning-message {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background: #fff3e0;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }

    .warning-message mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .warning-message p {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .medio-info {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .value {
      font-size: 14px;
      color: #333;
    }

    .danger-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 14px;
      font-weight: 500;
    }

    .modal-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class ModalConfirmarEliminacionComponent {
  constructor(
    private dialogRef: MatDialogRef<ModalConfirmarEliminacionComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  confirmarEliminacion(): void {
    // Eliminar pauta de localStorage
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasFiltradas = pautas.filter((pauta: any) => 
      !(pauta.planId === this.data.planId && 
        pauta.medio === this.data.medio.nombre && 
        pauta.proveedor === this.data.medio.proveedor)
    );
    
    localStorage.setItem('respuestasPautas', JSON.stringify(pautasFiltradas));
    
    this.snackBar.open('✅ Medio eliminado correctamente', '', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
    
    this.dialogRef.close({ shouldRefresh: true });
  }
} 