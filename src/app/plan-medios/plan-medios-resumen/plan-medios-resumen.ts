import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { BackendMediosService } from '../services/backend-medios.service';
import {
  MedioBackend,
  ProveedorBackend,
  CrearPlanMedioItemRequest,
  ActualizarPlanMedioItemRequest,
  PlanMedioItemUpdateDto,
  PlanMedioItemBackend,
  SpotsPorFechaData
} from '../models/backend-models';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ModalEliminarMediosComponent } from '../flow-chart/modal-eliminar-medios.component';

interface FilaMedioBase {
  tipo: 'nombre' | 'encabezado-medio' | 'spots' | 'inversiones';
  medio?: MedioPlan;
  nombre: string;
}

interface FilaMedioEncabezado extends FilaMedioBase {
  tipo: 'encabezado-medio';
  valorNeto: number;
  valorMensual: number;
  totalSpots: number;
  semanas: boolean[];
  soi: number;
}

interface FilaMedioNombre extends FilaMedioBase {
  tipo: 'nombre';
  semanas: boolean[];
  soi: number;
}

interface FilaMedioSpots extends FilaMedioBase {
  tipo: 'spots';
}

interface FilaMedioInversiones extends FilaMedioBase {
  tipo: 'inversiones';
}

type FilaMedio = FilaMedioEncabezado | FilaMedioNombre | FilaMedioSpots | FilaMedioInversiones;

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
  periodoSeleccionado!: PeriodoPlan;
  resumenPlan!: ResumenPlan;
  displayedColumns: string[] = ['medio', 'proveedor', 'canal', 'semanas', 'valor-mensual', 'total', 'soi'];
  semanasColumnas: string[] = []; // Ahora será dinámico
  semanasConFechas: Array<{ nombre: string, fechaInicio: string, fechaFin: string, fechaCompacta: string }> = [];
  dataSource: FilaMedio[] = [];
  planId: string | undefined; // Almacenar el ID del plan
  // Variable eliminada: flowChartAsociado - ya no es necesaria
  cargandoDatos: boolean = false; // Estado de carga de datos

  // Propiedades para navegación por meses
  mesesDisponibles: Array<{ nombre: string, anio: number, fechaInicio: string, fechaFin: string }> = [];
  mesActualIndex: number = 0;
  mesActual: { nombre: string, anio: number, fechaInicio: string, fechaFin: string } | null = null;

  // Control de cambios pendientes
  cambiosPendientes: boolean = false;
  guardandoResumen: boolean = false;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private plantillaService: PlantillaPautaService,
    private backendMediosService: BackendMediosService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const planData = navigation?.extras?.state?.['planData'] as any;
    const fromFlowChart = navigation?.extras?.state?.['fromFlowChart'] as boolean;
    const shouldReload = navigation?.extras?.state?.['shouldReload'] as boolean;

    /*
     * FLUJO DUAL:
     * 1. Desde consulta: Modal de consulta → navega con planId y version
     * 2. Desde FlowChart: FlowChart → regresa para recargar desde backend
     */
    if (planData && planData.id) {
      // Guardar el ID del plan
      this.planId = planData.id;
      
      // Inicializar resumen con datos básicos del plan
      this.resumenPlan = {
        id: String(planData.id || ''), // AGREGAR ID AQUÍ
        numeroPlan: String(planData.numeroPlan || ''), // Asegurar que sea string
        version: Number(planData.version || 1), // Asegurar que sea number válido
        cliente: String(planData.cliente || ''),
        producto: String(planData.producto || ''),
        campana: String(planData.campana || ''),
        fechaInicio: String(planData.fechaInicio || ''),
        fechaFin: String(planData.fechaFin || ''),
        periodos: []
      };
      this.periodos = [];

      // ✅ SIEMPRE CARGAR DESDE BACKEND
      if (fromFlowChart && shouldReload) {
        this.snackBar.open('🔄 Actualizando datos...', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
      
      // Consultar servicio con planId y version
      this.cargarPeriodosConPautas(planData.id, planData.version);
    } else {
      // No hay datos, redirigir a consulta
      this.router.navigate(['/plan-medios-consulta']);
      return;
    }

    // Solo procesar si hay períodos válidos
    if (this.resumenPlan.periodos && this.resumenPlan.periodos.length > 0) {
      this.periodoSeleccionado = this.resumenPlan.periodos[0];
      this.calcularMesesDisponibles();
      this.calcularSemanasConFechas();
      this.prepararDataSource();
    }
  }

  ngOnInit(): void {
    this.verificarYRecargarDatos();
  }

  private verificarYRecargarDatos(): void {
    // Si tenemos un planId, recargar los datos
    if (this.planId) {
      this.recargarResumen();
    }
  }

  private verificarIntegridadDatos(): void {
    if (!this.planId) return;

    // Verificar que el plan existe en planesMedios
    const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
    const planExiste = planesLocal.some((plan: any) => plan.id === this.planId);

    // Verificar que hay pautas para este plan
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasDelPlan = pautas.filter((pauta: any) => pauta.planId === this.planId);
  }

  prepararDataSource() {
    // Agrupar medios por nombre de medio
    const filas: FilaMedio[] = [];

    // Iterar sobre cada medio
    this.periodoSeleccionado.medios.forEach(medio => {
      // Calcular totales del medio (ya calculados en el procesamiento)
      const valorTotalMedio = Number(medio.valorNeto || 0);
      const valorMensualMedio = Number(this.calcularValorMensual(medio) || 0);
      const spotsMedio = Number(medio.salidas || 0);
      const soiMedio = spotsMedio > 0 ? Math.round(valorMensualMedio / spotsMedio) : 0;

      // Agregar fila de encabezado del medio
      const filaEncabezado: FilaMedioEncabezado = {
        tipo: 'encabezado-medio',
        nombre: medio.nombre,
        semanas: [],
        soi: soiMedio,
        valorNeto: valorTotalMedio,
        valorMensual: valorMensualMedio,
        totalSpots: spotsMedio
      };
      filas.push(filaEncabezado);

      // Agregar filas para cada proveedor del medio
      if (medio.proveedores && medio.proveedores.length > 0) {
        medio.proveedores.forEach(proveedor => {
          // Asegurar que todos los valores numéricos sean números
          const canalId = Number(proveedor.canalId || 0);
          const tarifa = Number(proveedor.tarifa || 0);
          const planMedioItemId = Number(proveedor.planMedioItemId || 0);
          const salidas = Number(proveedor.salidas || 0);
          const valorNeto = Number(proveedor.valorNeto || 0);
          const soi = Number(proveedor.soi || 0);

          // Crear una copia del medio con los datos del proveedor
          const medioConProveedor: MedioPlan = {
            ...medio,
            proveedor: proveedor.nombre,
            proveedorId: proveedor.proveedorId,
            canal: proveedor.canalDescripcion || proveedor.canal,
            canalId: canalId,
            canalNombre: proveedor.canal,
            canalDescripcion: proveedor.canalDescripcion,
            tarifa: tarifa,
            planMedioItemId: planMedioItemId,
            spotsPorFecha: proveedor.spotsPorFecha || {},
            salidas: salidas,
            valorNeto: valorNeto,
            soi: soi,
            semanas: proveedor.semanas || []
          };

          // Fila del proveedor  
          const filaNombre: FilaMedioNombre = {
            tipo: 'nombre',
            medio: medioConProveedor,
            nombre: `${proveedor.nombre} - ${proveedor.canalDescripcion || proveedor.canal}`,
            semanas: proveedor.semanas || [],
            soi: soi
          };
          filas.push(filaNombre);

          // Fila de spots del proveedor
          const filaSpots: FilaMedioSpots = {
            tipo: 'spots',
            medio: medioConProveedor,
            nombre: 'SPOTS'
          };
          filas.push(filaSpots);

          // Fila de inversiones del proveedor
          const filaInversiones: FilaMedioInversiones = {
            tipo: 'inversiones',
            medio: medioConProveedor,
            nombre: 'INVERSIONES'
          };
          filas.push(filaInversiones);
        });
      }
    });

    this.dataSource = filas;

    // Establecer variable CSS para el número de semanas
    this.establecerVariableCSSNumSemanas();
  }



  private establecerVariableCSSNumSemanas(): void {
    const numSemanas = this.semanasColumnas.length;
    document.documentElement.style.setProperty('--num-semanas', numSemanas.toString());
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
      default:
        return '';
    }
  }

  calcularPorcentaje(valorMedio: number): number {
    // Calcular la suma total de todos los medios
    const totalMedios = this.periodoSeleccionado.medios.reduce((total, medio) => total + this.calcularValorTotal(medio), 0);

    if (totalMedios === 0) {
      return 0;
    }

    // Calcular el porcentaje basado en la suma de los medios
    const porcentaje = (valorMedio / totalMedios) * 100;

    return porcentaje;
  }

  onPeriodoChange(periodo: PeriodoPlan): void {
    // Validar cambios pendientes antes de cambiar período
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'cambiar-periodo' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarCambioPeriodo(periodo);
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarCambioPeriodo(periodo);
        }
      });
    } else {
      this.ejecutarCambioPeriodo(periodo);
    }
  }

  private ejecutarCambioPeriodo(periodo: PeriodoPlan): void {
    this.periodoSeleccionado = periodo;
    this.calcularMesesDisponibles();
    this.calcularSemanasConFechas();
    this.prepararDataSource();
  }

  // Funciones de navegación por meses
  mesAnterior(): void {
    // Validar cambios pendientes antes de navegar
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'navegar-mes-anterior' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarMesAnterior();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarMesAnterior();
        }
      });
    } else {
      this.ejecutarMesAnterior();
    }
  }

  private ejecutarMesAnterior(): void {
    if (this.mesActualIndex > 0) {
      this.mesActualIndex--;
      this.mesActual = this.mesesDisponibles[this.mesActualIndex];
      this.calcularSemanasConFechas();
      this.prepararDataSource();
    }
  }

  mesSiguiente(): void {
    // Validar cambios pendientes antes de navegar
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'navegar-mes-siguiente' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarMesSiguiente();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarMesSiguiente();
        }
      });
    } else {
      this.ejecutarMesSiguiente();
    }
  }

  private ejecutarMesSiguiente(): void {
    if (this.mesActualIndex < this.mesesDisponibles.length - 1) {
      this.mesActualIndex++;
      this.mesActual = this.mesesDisponibles[this.mesActualIndex];
      this.calcularSemanasConFechas();
      this.prepararDataSource();
    }
  }

  // Funciones auxiliares para la navegación
  tieneMesAnterior(): boolean {
    return this.mesActualIndex > 0;
  }

  tieneMesSiguiente(): boolean {
    return this.mesActualIndex < this.mesesDisponibles.length - 1;
  }

  obtenerTituloMes(): string {
    if (!this.mesActual) return 'CRONOGRAMA';
    return `${this.mesActual.nombre} ${this.mesActual.anio}`;
  }

  calcularMesesDisponibles(): void {
    const fechaInicio = new Date(this.periodoSeleccionado.fechaInicio);
    const fechaFin = new Date(this.periodoSeleccionado.fechaFin);

    // ✅ CORRECCIÓN: Sumar un día para compensar problema de zona horaria
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    fechaFin.setDate(fechaFin.getDate() + 1);

    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    this.mesesDisponibles = [];

    let fechaActual = new Date(fechaInicio);

    while (fechaActual <= fechaFin) {
      const mes = fechaActual.getMonth();
      const anio = fechaActual.getFullYear();

      // Calcular el inicio y fin del mes actual
      const inicioMes = new Date(anio, mes, 1);
      const finMes = new Date(anio, mes + 1, 0);

      // Ajustar al rango del plan
      const inicioMesReal = inicioMes < fechaInicio ? fechaInicio : inicioMes;
      const finMesReal = finMes > fechaFin ? fechaFin : finMes;

      this.mesesDisponibles.push({
        nombre: meses[mes],
        anio: anio,
        fechaInicio: this.formatearFecha(inicioMesReal),
        fechaFin: this.formatearFecha(finMesReal)
      });

      // Avanzar al siguiente mes
      fechaActual.setMonth(fechaActual.getMonth() + 1);
      fechaActual.setDate(1);
    }

    // Establecer el primer mes como actual
    this.mesActualIndex = 0;
    this.mesActual = this.mesesDisponibles[0];

  }

  calcularSemanasConFechas(): void {
    this.semanasConFechas = [];
    this.semanasColumnas = [];

    if (!this.mesActual) return;

    // Parsear fechas con formato DD/MM/YYYY
    const fechaInicioParts = this.mesActual.fechaInicio.split('/');
    const fechaFinParts = this.mesActual.fechaFin.split('/');

    const fechaInicio = new Date(
      parseInt(fechaInicioParts[2]), // año
      parseInt(fechaInicioParts[1]) - 1, // mes (0-based)
      parseInt(fechaInicioParts[0]) // día
    );
    const fechaFin = new Date(
      parseInt(fechaFinParts[2]), // año
      parseInt(fechaFinParts[1]) - 1, // mes (0-based)
      parseInt(fechaFinParts[0]) // día
    );

    // ✅ CORRECCIÓN: Sumar un día para compensar problema de zona horaria
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    fechaFin.setDate(fechaFin.getDate() + 1);

    // Asegurar que las fechas se parseen correctamente
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);

    // ✅ SEMANAS COMPLETAS: Encontrar el lunes de la semana que contiene la fecha de inicio
    let inicioSemana = new Date(fechaInicio);
    const diaSemanaInicio = inicioSemana.getDay(); // 0=domingo, 1=lunes, etc.
    
    // Retroceder hasta el lunes de esa semana (SIEMPRE mostrar semana completa)
    if (diaSemanaInicio !== 1) {
      let diasHastaLunes = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1; // Si es domingo (0), retroceder 6 días
      inicioSemana.setDate(inicioSemana.getDate() - diasHastaLunes);
    }

    // ✅ SEMANAS COMPLETAS: Encontrar el domingo de la semana que contiene la fecha de fin
    let finPlan = new Date(fechaFin);
    const diaSemanaFin = finPlan.getDay(); // 0=domingo, 1=lunes, etc.
    
    // Avanzar hasta el domingo de esa semana (SIEMPRE mostrar semana completa)
    if (diaSemanaFin !== 0) {
      let diasHastaDomingo = 7 - diaSemanaFin; // Días que faltan para llegar al domingo
      finPlan.setDate(finPlan.getDate() + diasHastaDomingo);
    }

    let contadorSemana = 1;

    // Generar semanas completas de lunes a domingo
    while (inicioSemana <= finPlan) {
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6); // Domingo de la misma semana

      this.semanasConFechas.push({
        nombre: `S${contadorSemana}`,
        fechaInicio: this.formatearFecha(inicioSemana),
        fechaFin: this.formatearFecha(finSemana),
        fechaCompacta: this.formatearFechaCompacta(inicioSemana, finSemana)
      });

      this.semanasColumnas.push(`S${contadorSemana}`);

      contadorSemana++;

      // Avanzar al próximo lunes
      inicioSemana.setDate(inicioSemana.getDate() + 7);
    }


  }

  formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
  }

  formatearFechaCompacta(fechaInicio: Date, fechaFin: Date): string {
    const diaInicio = fechaInicio.getDate().toString().padStart(2, '0');
    const mesInicio = (fechaInicio.getMonth() + 1).toString().padStart(2, '0');
    const diaFin = fechaFin.getDate().toString().padStart(2, '0');
    const mesFin = (fechaFin.getMonth() + 1).toString().padStart(2, '0');

    // Si son el mismo mes, mostrar: 01-07/06
    if (fechaInicio.getMonth() === fechaFin.getMonth()) {
      return `${diaInicio}-${diaFin}/${mesInicio}`;
    } else {
      // Si son meses diferentes, mostrar: 30/06-07/07
      return `${diaInicio}/${mesInicio}-${diaFin}/${mesFin}`;
    }
  }

  /**
   * Genera un array de spots por semana inicializado en 0
   */
  private generarSpotsPorSemana(): number[] {
    const numSemanas = this.semanasColumnas.length || 5; // Fallback a 5 semanas
    return new Array(numSemanas).fill(0);
  }

  /**
   * Genera un array de semanas boolean inicializado en false
   */
  private generarSemanasBoolean(): boolean[] {
    const numSemanas = this.semanasColumnas.length || 5; // Fallback a 5 semanas
    return new Array(numSemanas).fill(false);
  }

  onNuevaPauta(): void {
    this.navegarConConfirmacion('/plan-medios-nueva-pauta', {
      id: this.planId,
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana,
      fechaInicio: this.resumenPlan.fechaInicio,
      fechaFin: this.resumenPlan.fechaFin
    });
  }

  onEditarMedio(medio: any): void {
    this.navegarConConfirmacion('/plan-medios-nueva-pauta', {
      id: this.planId,
      numeroPlan: this.resumenPlan.numeroPlan,
      version: this.resumenPlan.version,
      cliente: this.resumenPlan.cliente,
      producto: this.resumenPlan.producto,
      campana: this.resumenPlan.campana,
      fechaInicio: this.resumenPlan.fechaInicio,
      fechaFin: this.resumenPlan.fechaFin,
      medioSeleccionado: medio.nombre
    });
  }

  onAccionMedio(medio: any): void {
    // Validar cambios pendientes antes de abrir acciones del medio
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'acciones-medio' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarAccionMedio(medio);
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarAccionMedio(medio);
        }
      });
    } else {
      this.ejecutarAccionMedio(medio);
    }
  }

  private ejecutarAccionMedio(medio: any): void {
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
        this.editarMedio(medio);
      } else if (result && result.accion === 'eliminar') {
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
        resumenPlan: this.resumenPlan
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        if (result.medioActualizado) {
          // Actualización específica para cambios de tarifa
          
          // Actualizar inmediatamente la tarifa en el modelo local (para respuesta inmediata)
          this.actualizarTarifaEnModelo(result.medioActualizadoId || medio.planMedioItemId, result.nuevaTarifa);
          
          // Recargar datos desde el backend para obtener valores actualizados
          this.recargarResumen();
          
          // Ejecutar guardarResumen automáticamente después de modificar medio
          this.guardarResumen();
          
          // Marcar que hay cambios para detectar cambios futuros
          this.cambiosPendientes = false;
        } else {
          // Recarga normal
          this.recargarResumen();
          
          // Ejecutar guardarResumen automáticamente después de modificar medio
          this.guardarResumen();
          
          this.cambiosPendientes = false;
        }
      }
    });
  }

  // Método para actualizar la tarifa directamente en el modelo local (temporal hasta que se recargue desde BD)
  private actualizarTarifaEnModelo(planMedioItemId: number, nuevaTarifa: number): void {
    if (!planMedioItemId || !nuevaTarifa) return;
    
    // Buscar y actualizar en periodoSeleccionado
    const medioEncontrado = this.periodoSeleccionado.medios.find(m => m.planMedioItemId === planMedioItemId);
    if (medioEncontrado) {
      medioEncontrado.tarifa = nuevaTarifa;
      
      // Forzar actualización inmediata del dataSource
      this.prepararDataSource();
    }
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
        this.recargarResumen();
        
        // ✅ EJECUTAR GUARDAR RESUMEN AUTOMÁTICAMENTE DESPUÉS DE ELIMINAR
        setTimeout(() => {
          this.guardarResumen();
        }, 1000); // Pequeño delay para asegurar que la recarga termine
      }
    });
  }

  onDescargaFlow(): void {
    // Validar cambios pendientes antes de descargar
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'descarga-flow' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarDescargaFlow();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarDescargaFlow();
        }
      });
    } else {
      this.ejecutarDescargaFlow();
    }
  }

  private ejecutarDescargaFlow(): void {
    // TODO: Implementar lógica de descarga
    this.snackBar.open('📥 Descarga FlowChart iniciada', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  onAgregarMedio(): void {
    // Validar cambios pendientes antes de agregar medio
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'agregar-medio' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarAgregarMedio();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarAgregarMedio();
        }
      });
    } else {
      this.ejecutarAgregarMedio();
    }
  }

  private ejecutarAgregarMedio(): void {
    // Forzar recarga de datos antes de abrir el modal
    this.recargarResumen();

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

    // ✅ PREPARAR MEDIOS EXISTENTES ACTUALIZADOS desde el período seleccionado

    console.log('📊 Medios disponibles en periodo:', this.periodoSeleccionado?.medios || []);
    
    const mediosExistentes = [];
    
    if (this.periodoSeleccionado && this.periodoSeleccionado.medios && this.periodoSeleccionado.medios.length > 0) {
      // Procesar cada medio y sus proveedores/canales
      for (const medio of this.periodoSeleccionado.medios) {
        console.log('🎯 Procesando medio:', medio.nombre, 'con proveedores:', medio.proveedores);
        
        if (medio.proveedores && medio.proveedores.length > 0) {
          // Si el medio tiene proveedores, crear una entrada por cada proveedor/canal
          for (const proveedor of medio.proveedores) {
  
            mediosExistentes.push({
              medio: medio.nombre || 'Sin nombre',
              proveedor: proveedor.nombre || 'Sin proveedor',
              canal: proveedor.canal || 'Sin canal', // proveedor.canal ES el nombre del canal
              canalId: proveedor.canalId,
              canalNombre: proveedor.canal, // Nombre del canal (prioritario)
              canalDescripcion: proveedor.canalDescripcion, // Descripción del canal
              tarifa: proveedor.tarifa || 0,
              planMedioItemId: proveedor.planMedioItemId
            });
          }
        } else {
          // Si no tiene proveedores, crear entrada con los datos del medio principal
          mediosExistentes.push({
            medio: medio.nombre || 'Sin nombre',
            proveedor: medio.proveedor || 'Sin proveedor',
            canal: medio.canalNombre || medio.canal || 'Sin canal', // Priorizar canalNombre para el medio principal
            canalId: medio.canalId,
            canalNombre: medio.canalNombre || medio.canal, // Priorizar canalNombre
            canalDescripcion: medio.canalDescripcion,
            tarifa: medio.tarifa || 0,
            planMedioItemId: medio.planMedioItemId
          });
        }
      }
    }
    




    const dialogRef = this.dialog.open(ModalAgregarMedioComponent, {
      width: '600px',
      data: {
        planData,
        numSemanas: this.semanasColumnas.length,
        mediosExistentes // ✅ AGREGAR medios existentes actualizados
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        this.recargarResumen();
        // Ejecutar guardarResumen automáticamente después de agregar medio
        this.guardarResumen();
        // Marcar cambios pendientes tras agregar medio
        this.cambiosPendientes = true;
      }
    });
  }

  onIrAFlowChart(): void {
    // Aplicar confirmación si hay cambios pendientes
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: '/flow-chart' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarNavegacionFlowChart();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarNavegacionFlowChart();
        }
      });
    } else {
      this.ejecutarNavegacionFlowChart();
    }
  }

  private ejecutarNavegacionFlowChart(): void {
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
        spotsPorSemana: this.convertirSpotsPorFechaAArray(medio.spotsPorFecha) || [0, 0, 0, 0, 0],
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

    // Navegar directamente al flowchart
    this.router.navigate(['/flow-chart'], {
      state: {
        planData: this.resumenPlan,
        mediosYProveedores: datosFlowChart.mediosYProveedores,
        fromPlanMedios: true
      }
    });
  }

  // Método sincronizarResumenConFlowChart eliminado - ya no es necesario

  onAprobarPlan(): void {
    // Validar cambios pendientes antes de aprobar
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'aprobar-plan' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarAprobarPlan();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarAprobarPlan();
        }
      });
    } else {
      this.ejecutarAprobarPlan();
    }
  }

  private ejecutarAprobarPlan(): void {
    if (this.resumenPlan.aprobado) {
      this.snackBar.open('✅ Plan aprobado exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } else {
      this.snackBar.open('⚠️ El plan debe ser revisado. No se puede aprobar en este momento.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  onRegresar(): void {
    this.navegarConConfirmacion('/plan-medios-consulta');
  }

  // Método para navegar con confirmación de cambios pendientes
  navegarConConfirmacion(ruta: string, stateData?: any): void {
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          // Guardar primero y luego navegar
          this.guardarResumen();
          this.ejecutarNavegacion(ruta, stateData);
        } else if (result && result.accion === 'continuar') {
          // Continuar sin guardar
          this.cambiosPendientes = false;
          this.ejecutarNavegacion(ruta, stateData);
        }
        // Si cancela, no hacer nada
      });
    } else {
      // No hay cambios pendientes, navegar directamente
      this.ejecutarNavegacion(ruta, stateData);
    }
  }

  private ejecutarNavegacion(ruta: string, stateData?: any): void {
    if (stateData) {
      if (ruta === '/plan-medios-nueva-pauta') {
    
        this.router.navigate([ruta], { state: { planData: stateData } });
      } else {
        this.router.navigate([ruta], { state: stateData });
      }
    } else {
      this.router.navigate([ruta]);
    }
  }

  async exportarPDF() {
    // Validar cambios pendientes antes de exportar
    if (this.cambiosPendientes) {
      const dialogRef = this.dialog.open(ModalConfirmarCambiosPendientesComponent, {
        width: '400px',
        data: { ruta: 'exportar-pdf' },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (result && result.accion === 'guardar') {
          this.guardarResumen();
          this.ejecutarExportarPDF();
        } else if (result && result.accion === 'continuar') {
          this.cambiosPendientes = false;
          this.ejecutarExportarPDF();
        }
      });
    } else {
      this.ejecutarExportarPDF();
    }
  }

  private async ejecutarExportarPDF() {
    try {
      // Mostrar mensaje de carga
      this.snackBar.open('📄 Generando FlowChart...', '', {
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
      this.snackBar.open('✅ FlowChart generado exitosamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error al generar FlowChart:', error);
      this.snackBar.open('❌ Error al generar el FlowChart', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }



  private cargarPeriodosConPautas(planId: string, version: string | number): void {
    // Cargar directamente desde el backend usando el servicio
    const planNumerico = Number(planId);
    const versionNumerico = Number(version);

    // Cargar de forma asíncrona desde el backend
    this.cargarDatosDesdeBackend(planNumerico, versionNumerico);
  }

  private cargarDatosDesdeBackend(planMedioId: number, version: number): void {
    this.cargandoDatos = true;
    this.backendMediosService.getPlanMedioItemsPorPlan(planMedioId, version).subscribe(
      (planMedioItems: PlanMedioItemBackend[]) => {
        
        if (planMedioItems.length > 0) {
          const periodosConDatos = this.procesarPlanMedioItemsDesdeBackend(planMedioItems);
          this.resumenPlan.periodos = periodosConDatos;
          this.periodos = periodosConDatos;
          this.periodoSeleccionado = periodosConDatos[0];
          this.calcularMesesDisponibles();
          this.calcularSemanasConFechas();
          this.prepararDataSource();

          this.cargandoDatos = false;
        } else {
          // Plan existe pero sin medios - crear período vacío para que funcione el resumen
          const periodoVacio = this.crearPeriodoVacio(this.resumenPlan.fechaInicio, this.resumenPlan.fechaFin);
          this.resumenPlan.periodos = [periodoVacio];
          this.periodos = [periodoVacio];
          this.periodoSeleccionado = periodoVacio;
          this.calcularMesesDisponibles();
          this.calcularSemanasConFechas();
          this.prepararDataSource();

          this.cargandoDatos = false;
        }
      },
      (error) => {
        // Crear período vacío funcional para poder agregar medios
        const periodoVacio = this.crearPeriodoVacio(this.resumenPlan.fechaInicio, this.resumenPlan.fechaFin);
        this.resumenPlan.periodos = [periodoVacio];
        this.periodos = [periodoVacio];
        this.periodoSeleccionado = periodoVacio;
        this.calcularMesesDisponibles();
        this.calcularSemanasConFechas();
        this.prepararDataSource();
        
        this.cargandoDatos = false;
      }
    );
  }

  private procesarPlanMedioItemsDesdeBackend(planMedioItems: PlanMedioItemBackend[]): PeriodoPlan[] {
    const fechaInicio = this.resumenPlan.fechaInicio;
    const fechaFin = this.resumenPlan.fechaFin;
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);

    // Agrupar items solo por medio
    const mediosMap = new Map<string, MedioPlan>();

    planMedioItems.forEach((item: PlanMedioItemBackend) => {
      const medio = item.medioNombre || 'Medio desconocido';
      const proveedor = item.proveedorNombre || 'Proveedor desconocido';
      const canal = item.canalNombre || item.canalDescripcion || 'Sin canal';
      
      

      // Parsear el dataJson si existe
      let spotsPorFecha: { [fecha: string]: number } = {};
      let totalSpots = 0;
      let valorTotal = 0;

      if (item.dataJson && item.dataJson.trim() !== '') {
        try {
          const dataJsonParsed: SpotsPorFechaData = JSON.parse(item.dataJson);
          spotsPorFecha = dataJsonParsed.spotsPorFecha || {};
          totalSpots = dataJsonParsed.totalSpots || 0;
          valorTotal = dataJsonParsed.valorTotal || 0;
          

        } catch (error) {
          console.error('❌ Error parseando dataJson para', medio, proveedor, ':', error);
        }
      }

      // Si no hay data en JSON o totalSpots es 0, usar valores básicos de la tarifa
      if (totalSpots === 0) {
        totalSpots = 0;
        valorTotal = 0;

      }

      // Generar semanas boolean basado en spots por fecha
      const semanasBoolean = this.generarSemanasBoolean();

      // Procesar campos de flowchart
      let spotsCalculadosFlowchart: { [fecha: string]: number } = {};
      let pasoPorFlowchart = item.pasoPorFlowchart || false;
      
      if (pasoPorFlowchart && item.calendarioJson) {
        try {
          const calendarioData = JSON.parse(item.calendarioJson);
          spotsCalculadosFlowchart = this.calcularSpotsPorSemanaDesdeCalendario(calendarioData);
          
          totalSpots = Object.values(spotsCalculadosFlowchart).reduce((sum: number, spots: number) => sum + (spots || 0), 0);
          valorTotal = totalSpots * (item.tarifa || 0);
        } catch (error) {
          console.error('❌ Error procesando calendarioJson para', medio, proveedor, ':', error);
          spotsCalculadosFlowchart = {};
        }
      }

      // Crear o actualizar el medio
      if (mediosMap.has(medio)) {
        // Si el medio ya existe, actualizar sus totales
        const medioExistente = mediosMap.get(medio)!;
        medioExistente.salidas += totalSpots;
        medioExistente.valorNeto += valorTotal;
        medioExistente.soi = medioExistente.salidas > 0 ? Math.round(medioExistente.valorNeto / medioExistente.salidas) : 0;

        // Agregar o actualizar el proveedor y canal como subgrupo
        if (!medioExistente.proveedores) {
          medioExistente.proveedores = [];
        }

        medioExistente.proveedores.push({
          nombre: proveedor,
          proveedorId: item.proveedorId.toString(),
          canal: canal,
          canalId: item.canalId,
          canalDescripcion: item.canalDescripcion,
          salidas: totalSpots,
          valorNeto: valorTotal,
          soi: totalSpots > 0 ? Math.round(valorTotal / totalSpots) : 0,
          semanas: semanasBoolean,
          tarifa: item.tarifa,
          spotsPorFecha: pasoPorFlowchart && Object.keys(spotsCalculadosFlowchart).length > 0 ? spotsCalculadosFlowchart : spotsPorFecha,
          planMedioItemId: item.planMedioItemId,
          pasoPorFlowchart: pasoPorFlowchart,
          calendarioJson: item.calendarioJson
        });

        // Actualizar spotsPorFecha del medio principal
        if (pasoPorFlowchart && Object.keys(spotsCalculadosFlowchart).length > 0) {
          medioExistente.spotsPorFecha = { ...medioExistente.spotsPorFecha, ...spotsCalculadosFlowchart };
        } else {
          medioExistente.spotsPorFecha = { ...medioExistente.spotsPorFecha, ...spotsPorFecha };
        }

      } else {
        // Si es un nuevo medio, crear con su primer proveedor
        const nuevoMedio: MedioPlan = {
          nombre: medio,
          proveedor: '', // Ya no usamos un solo proveedor
          proveedorId: '', // Ya no usamos un solo proveedorId
          canal: '', // Ya no usamos un solo canal
          canalId: 0, // Ya no usamos un solo canalId
          canalDescripcion: '', // Ya no usamos una sola descripción
          salidas: totalSpots,
          valorNeto: valorTotal,
          soi: totalSpots > 0 ? Math.round(valorTotal / totalSpots) : 0,
          semanas: semanasBoolean,
          tarifa: 0, // La tarifa ahora es por proveedor
          spotsPorFecha: pasoPorFlowchart && Object.keys(spotsCalculadosFlowchart).length > 0 ? spotsCalculadosFlowchart : spotsPorFecha,
          planMedioItemId: item.planMedioItemId,
          pasoPorFlowchart: pasoPorFlowchart,
          calendarioJson: item.calendarioJson,
          proveedores: [{
            nombre: proveedor,
            proveedorId: item.proveedorId.toString(),
            canal: canal,
            canalId: item.canalId,
            canalDescripcion: item.canalDescripcion,
            salidas: totalSpots,
            valorNeto: valorTotal,
            soi: totalSpots > 0 ? Math.round(valorTotal / totalSpots) : 0,
            semanas: semanasBoolean,
            tarifa: item.tarifa,
            spotsPorFecha: pasoPorFlowchart && Object.keys(spotsCalculadosFlowchart).length > 0 ? spotsCalculadosFlowchart : spotsPorFecha,
            planMedioItemId: item.planMedioItemId,
            pasoPorFlowchart: pasoPorFlowchart,
            calendarioJson: item.calendarioJson
          }]
        };

        mediosMap.set(medio, nuevoMedio);
      }
    });

    // Convertir map a array
    const medios = Array.from(mediosMap.values());

    // Calcular totales
    const totalInversionNeta = medios.reduce((total, medio) => total + medio.valorNeto, 0);
    const iva = Math.round(totalInversionNeta * 0.19);
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

    // ✅ CORRECCIÓN: Sumar un día para compensar problema de zona horaria
    fechaIni.setDate(fechaIni.getDate() + 1);
    fechaFinal.setDate(fechaFinal.getDate() + 1);

    const mesInicio = fechaIni.getUTCMonth(); // 0-11
    const mesFin = fechaFinal.getUTCMonth(); // 0-11
    const anioInicio = fechaIni.getUTCFullYear();
    const anioFin = fechaFinal.getUTCFullYear();

    // Debug: Agregar logs temporales
    

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

  /**
   * ✅ CORREGIDO: Calcular spots por semana desde calendarioJson de flowchart
   * Toma el JSON de spots por días y los agrupa por semanas usando la lógica existente
   */
  private calcularSpotsPorSemanaDesdeCalendario(calendarioData: any): { [fecha: string]: number } {
    const spotsPorSemana: { [fecha: string]: number } = {};

    try {
      // ✅ CORRECCIÓN: Buscar el formato correcto del calendarioJson
      let spotsPorFecha: { [fecha: string]: number } = {};
      
      if (calendarioData.spotsPorFecha && typeof calendarioData.spotsPorFecha === 'object') {
        // Formato desde FlowChart: { "spotsPorFecha": {...}, "totalSpots": X }
        spotsPorFecha = calendarioData.spotsPorFecha;
      } else if (typeof calendarioData === 'object' && !Array.isArray(calendarioData)) {
        // Formato directo: { "2024-01-01": 10, "2024-01-02": 15, ... }
        spotsPorFecha = calendarioData;
      } else {
        console.warn('⚠️ CalendarioJson no tiene formato esperado:', calendarioData);
        return {};
      }

      // Validar que hay datos para procesar
      if (Object.keys(spotsPorFecha).length === 0) {
        return {};
      }

      // ✅ CORRECCIÓN: Usar las semanas ya calculadas para agrupar los spots por día
      this.semanasConFechas.forEach((semana, index) => {
        let totalSpotsSemana = 0;
        
        // ✅ CORRECCIÓN: Convertir fechas de semana (DD/MM/YYYY) a objetos Date
        const fechaInicioParts = semana.fechaInicio.split('/');
        const fechaFinParts = semana.fechaFin.split('/');
        
        const fechaInicioSemana = new Date(
          parseInt(fechaInicioParts[2]), // año
          parseInt(fechaInicioParts[1]) - 1, // mes (0-based)
          parseInt(fechaInicioParts[0]) // día
        );
        
        const fechaFinSemana = new Date(
          parseInt(fechaFinParts[2]), // año
          parseInt(fechaFinParts[1]) - 1, // mes (0-based)
          parseInt(fechaFinParts[0]) // día
        );

        // ✅ CORRECCIÓN: Normalizar fechas para evitar problemas de zona horaria
        fechaInicioSemana.setHours(0, 0, 0, 0);
        fechaFinSemana.setHours(23, 59, 59, 999);



        // ✅ CORRECCIÓN: Sumar spots de todos los días de esta semana
        Object.keys(spotsPorFecha).forEach(fechaStr => {
          let fechaDia: Date;
          
          // ✅ CORRECCIÓN: El flowchart guarda fechas en formato YYYY-MM-DD
          if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD (desde FlowChart)
            fechaDia = new Date(fechaStr + 'T00:00:00.000Z');
            fechaDia.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de zona horaria
          } else if (fechaStr.includes('/')) {
            // Formato DD/MM/YYYY (alternativo)
            const parts = fechaStr.split('/');
            fechaDia = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0, 0);
          } else {
            // Intentar parseo directo
            fechaDia = new Date(fechaStr);
            fechaDia.setHours(12, 0, 0, 0);
          }

          // ✅ CORRECCIÓN: Verificar si la fecha está dentro del rango de esta semana
          if (fechaDia >= fechaInicioSemana && fechaDia <= fechaFinSemana) {
            const spots = spotsPorFecha[fechaStr] || 0;
            totalSpotsSemana += spots;
            

          }
        });

        // ✅ CORRECCIÓN: Guardar el total de spots de la semana (incluso si es 0 para mostrar consistencia)
        spotsPorSemana[semana.fechaInicio] = totalSpotsSemana;
        
        
      });

      return spotsPorSemana;

    } catch (error) {
      console.error('❌ Error calculando spots por semana desde calendario:', error);
      console.error('❌ Datos que causaron el error:', calendarioData);
      return {};
    }
  }

  // Método para recargar el resumen después de agregar un medio
  recargarResumen(): void {
    if (this.planId) {
      // Recargar datos desde el backend
      const planNumerico = Number(this.planId);
      const version = this.resumenPlan.version;

      this.cargandoDatos = true;
      this.cargarDatosDesdeBackend(planNumerico, version);
    } else {
      console.error('❌ No hay ID de plan para recargar');
    }
  }





  // Método para guardar todos los cambios del resumen
  guardarResumen(): void {
    if (!this.cambiosPendientes) {
      this.snackBar.open('ℹ️ No hay cambios pendientes para guardar', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['info-snackbar']
      });
      return;
    }

    this.guardandoResumen = true;
    let mediosActualizados = 0;
    let totalMedios = 0;

    // Contar medios con cambios
    this.periodoSeleccionado.medios.forEach(medio => {
      if (medio.planMedioItemId) {
        totalMedios++;
      }
    });

    if (totalMedios === 0) {
      this.snackBar.open('ℹ️ No hay medios para guardar', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['info-snackbar']
      });
      this.guardandoResumen = false;
      return;
    }

    // Guardar todos los medios
    this.periodoSeleccionado.medios.forEach(medio => {
      if (medio.planMedioItemId) {
        this.actualizarSpotsEnBackend(medio).then(() => {
          mediosActualizados++;
          if (mediosActualizados === totalMedios) {
            // Todos los medios actualizados
            this.guardandoResumen = false;
            this.cambiosPendientes = false;
            this.snackBar.open('✅ Resumen guardado exitosamente', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['success-snackbar']
            });

          }
        }).catch((error) => {
          console.error('❌ Error guardando medio:', medio.nombre, error);
          mediosActualizados++;
          if (mediosActualizados === totalMedios) {
            this.guardandoResumen = false;
            this.snackBar.open('⚠️ Resumen guardado con algunos errores', '', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            });
          }
        });
      }
    });
  }

  /**
   * ✅ NUEVO: Verificar si un medio es editable (no vino de flowchart)
   */
  isMedioEditable(medio: MedioPlan): boolean {
    return !medio.pasoPorFlowchart;
  }

  /**
   * ✅ NUEVO: Obtener mensaje de bloqueo para medios de flowchart
   */
  getMensajeBloqueoFlowchart(medio: MedioPlan): string {
    if (medio.pasoPorFlowchart) {
      return 'Este medio viene del FlowChart y no puede ser editado aquí. Los spots se calculan automáticamente desde el calendario de FlowChart.';
    }
    return '';
  }

  // Método para actualizar spots y recalcular inversiones
  onSpotsChange(medio: MedioPlan, semanaIndex: number, event: Event): void {
    // ✅ NUEVO: Bloquear edición si el medio vino de flowchart
    if (medio.pasoPorFlowchart) {
      console.warn('⚠️ Intento de editar medio que vino de flowchart bloqueado:', medio.nombre);
      this.snackBar.open('❌ Este medio viene del FlowChart y no puede ser editado aquí', '', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
      
      // Revertir el valor en el input
      const target = event.target as HTMLInputElement;
      const spotsActuales = this.obtenerSpotsPorFecha(medio, semanaIndex);
      target.value = spotsActuales.toString();
      return;
    }

    const target = event.target as HTMLInputElement;
    const nuevoSpots = parseInt(target.value) || 0;

    // Obtener la fecha específica de la semana
    const semanaActual = this.semanasConFechas[semanaIndex];
    if (!semanaActual) {
      return;
    }

    // Inicializar spotsPorFecha si no existe
    if (!medio.spotsPorFecha) {
      medio.spotsPorFecha = {};
    }

    // Usar la fecha de inicio de la semana como clave
    const fechaClave = semanaActual.fechaInicio;
    medio.spotsPorFecha[fechaClave] = nuevoSpots;

    // Recalcular salidas totales sumando todos los spots guardados
    medio.salidas = Object.values(medio.spotsPorFecha).reduce((total: number, spots: number) => total + (spots || 0), 0);

    // Recalcular inversiones totales USANDO LA TARIFA
    medio.valorNeto = medio.salidas * (medio.tarifa || 0);

    // Recalcular SOI
    medio.soi = medio.salidas > 0 ? Math.round(medio.valorNeto / medio.salidas) : 0;

    // Actualizar totales del período
    this.actualizarTotalesPeriodo();

    // Marcar que hay cambios pendientes
    this.cambiosPendientes = true;
  }

  // Método para actualizar spots en el backend
  private actualizarSpotsEnBackend(medio: MedioPlan): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!medio.planMedioItemId || !this.planId) {
              reject('Falta planMedioItemId o planId');
        return;
      }

      const dataJson: SpotsPorFechaData = {
        spotsPorFecha: medio.spotsPorFecha || {},
        totalSpots: medio.salidas,
        valorTotal: medio.valorNeto
      };

      const actualizarRequest: ActualizarPlanMedioItemRequest = {
        planMedioItemId: medio.planMedioItemId,
        planMedioId: Number(this.planId),
        version: this.resumenPlan.version || 1,
        medioId: 1, // TODO: Obtener el medioId real desde el backend
        proveedorId: Number(medio.proveedorId),
        tarifa: medio.tarifa || 0,
        dataJson: JSON.stringify(dataJson),
        usuarioModifico: 'SYSTEM' // TODO: Obtener usuario actual
      };

      this.backendMediosService.actualizarPlanMedioItem(actualizarRequest).subscribe(
        (response: PlanMedioItemBackend) => {
          resolve();
        },
        (error: any) => {
          console.error('❌ Error actualizando spots en backend:', error);
          reject(error);
        }
      );
    });
  }

  // Método para calcular total de spots
  calcularTotalSpots(medio: MedioPlan): number {
    if (!medio.spotsPorFecha) {
      return medio.salidas || 0;
    }
    // Sumar todos los spots guardados por fecha
    return Object.values(medio.spotsPorFecha).reduce((total: number, spots: number) => total + (spots || 0), 0);
  }

  // Método para obtener spots por fecha específica
  obtenerSpotsPorFecha(medio: MedioPlan, semanaIndex: number): number {
    if (!medio.spotsPorFecha || !this.semanasConFechas[semanaIndex]) {
      return 0;
    }
    const fechaClave = this.semanasConFechas[semanaIndex].fechaInicio;
    return medio.spotsPorFecha[fechaClave] || 0;
  }

  // Método para calcular inversión por semana
  calcularInversionSemana(medio: MedioPlan, semanaIndex: number): number {
    if (!medio.tarifa || !this.semanasConFechas[semanaIndex]) {
      return 0;
    }
    const spotsEnSemana = this.obtenerSpotsPorFecha(medio, semanaIndex);
    return spotsEnSemana * medio.tarifa;
  }

  // Método para actualizar totales del período
  private actualizarTotalesPeriodo(): void {
    const totalInversionNeta = this.periodoSeleccionado.medios.reduce((total, medio) => total + this.calcularValorTotal(medio), 0);
    const iva = Math.round(totalInversionNeta * 0.19);
    const totalInversion = totalInversionNeta + iva;

    this.periodoSeleccionado.totalInversionNeta = totalInversionNeta;
    this.periodoSeleccionado.iva = iva;
    this.periodoSeleccionado.totalInversion = totalInversion;

    // Actualizar el dataSource para reflejar los cambios
    this.prepararDataSource();
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

  // Método eliminado: obtenerProveedoresPorMedio - ya no se necesita
  // Los proveedores se cargan dinámicamente desde el backend

  // Método para convertir spots por fecha a array (compatibilidad con flowchart)
  private convertirSpotsPorFechaAArray(spotsPorFecha?: { [fecha: string]: number }): number[] {
    if (!spotsPorFecha) {
      return [0, 0, 0, 0, 0];
    }

    const array = [0, 0, 0, 0, 0];

    // Mapear cada fecha a su índice correspondiente en el array
    this.semanasConFechas.forEach((semana, index) => {
      if (index < 5 && spotsPorFecha[semana.fechaInicio]) {
        array[index] = spotsPorFecha[semana.fechaInicio];
      }
    });

    return array;
  }

  // Método temporal para limpiar logs de debugging
  limpiarLogsDebugging(): void {
    console.clear();

    this.snackBar.open('🧹 Logs de debugging limpiados', '', {
      duration: 1000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  // Método para debugging - mostrar estado actual del resumen
  mostrarEstadoResumen(): void {

  }

  // Método para mostrar información sobre la integración con el backend
  mostrarInfoBackend(): void {


    this.snackBar.open('ℹ️ Integración backend completada - Ver consola para detalles', '', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
  }

  /**
   * ✅ NUEVO: Método para mostrar información de debugging sobre flowchart
   */
  mostrarInfoFlowchart(): void {
    const mediosFlowchart = this.periodoSeleccionado?.medios?.filter(m => m.pasoPorFlowchart) || [];
    const mediosNormales = this.periodoSeleccionado?.medios?.filter(m => !m.pasoPorFlowchart) || [];

    this.snackBar.open(`ℹ️ FlowChart: ${mediosFlowchart.length} medios bloqueados, ${mediosNormales.length} editables - Ver consola`, '', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    });
  }

  // Método para calcular el valor mensual de un medio
  calcularValorMensual(medio?: MedioPlan): number {
    if (!medio || !medio.spotsPorFecha || !this.semanasConFechas) {
      return 0;
    }

    // Calcular el valor total del mes actual sumando todas las semanas del mes
    let valorMensual = 0;
    this.semanasConFechas.forEach(semana => {
      const spots = Number(medio.spotsPorFecha?.[semana.fechaInicio] || 0);
      valorMensual += spots * Number(medio.tarifa || 0);
    });

    return valorMensual;
  }

  // Método para calcular el valor total de un medio (basado en spots actuales)
  calcularValorTotal(medio?: MedioPlan): number {
    if (!medio || !medio.spotsPorFecha) {
      return 0;
    }

    // Calcular el valor total sumando todos los spots por fecha
    let valorTotal = 0;
    Object.values(medio.spotsPorFecha).forEach(spots => {
      valorTotal += Number(spots || 0) * Number(medio.tarifa || 0);
    });

    return valorTotal;
  }

  // Método para calcular los spots mensuales de un medio
  calcularSpotsMensual(medio?: MedioPlan): number {
    if (!medio || !medio.spotsPorFecha || !this.semanasConFechas) {
      return 0;
    }

    // Calcular el total de spots del mes actual sumando todas las semanas del mes
    let spotsMensual = 0;
    this.semanasConFechas.forEach(semana => {
      const spots = medio.spotsPorFecha?.[semana.fechaInicio] || 0;
      spotsMensual += spots;
    });

    return spotsMensual;
  }

  // Método para calcular el total de inversión neta mensual
  calcularTotalInversionMensual(): number {
    if (!this.periodoSeleccionado.medios || this.periodoSeleccionado.medios.length === 0) {
      return 0;
    }

    return this.periodoSeleccionado.medios.reduce((total, medio) => {
      return total + this.calcularValorMensual(medio);
    }, 0);
  }

  // Método para calcular el total de inversión neta total
  calcularTotalInversionTotal(): number {
    if (!this.periodoSeleccionado.medios || this.periodoSeleccionado.medios.length === 0) {
      return 0;
    }

    return this.periodoSeleccionado.medios.reduce((total, medio) => {
      return total + this.calcularValorTotal(medio);
    }, 0);
  }

  // Método para calcular el IVA mensual
  calcularIvaMensual(): number {
    const inversionNetaMensual = this.calcularTotalInversionMensual();
    return Math.round(inversionNetaMensual * 0.19);
  }

  // Método para calcular el IVA total
  calcularIvaTotal(): number {
    const inversionNetaTotal = this.calcularTotalInversionTotal();
    return Math.round(inversionNetaTotal * 0.19);
  }

  // Método para calcular el total mensual (inversión + IVA)
  calcularTotalMensual(): number {
    const inversionNetaMensual = this.calcularTotalInversionMensual();
    const ivaMensual = this.calcularIvaMensual();
    return inversionNetaMensual + ivaMensual;
  }

  // Método para calcular el total general (inversión + IVA)
  calcularTotalGeneral(): number {
    const inversionNetaTotal = this.calcularTotalInversionTotal();
    const ivaTotal = this.calcularIvaTotal();
    return inversionNetaTotal + ivaTotal;
  }

  // Método para calcular el porcentaje SOI para filas de encabezado de medio
  calcularPorcentajeSOI(valorNeto: number): number {
    // Calcular el porcentaje basado en el valor total del plan
    const totalInversionNeta = this.periodoSeleccionado.medios.reduce((total, medio) => total + this.calcularValorTotal(medio), 0);
    
    if (totalInversionNeta === 0) {
      return 0;
    }

    // Calcular el porcentaje basado en la inversión neta total
    const porcentaje = (valorNeto / totalInversionNeta) * 100;
    
    return porcentaje;
  }

  // ✅ Método para validar si hay medios disponibles para ir a FlowChart
  tieneMediosParaFlowChart(): boolean {
    // Siempre permitir acceso a FlowChart
    return true;
  }

  onEliminarMasivo(): void {
    // Preparar los datos para el modal
    const mediosAgrupados = new Map<string, any[]>();
    
    // Agrupar por nombre de medio
    this.periodoSeleccionado.medios.forEach(medio => {
      if (!mediosAgrupados.has(medio.nombre)) {
        mediosAgrupados.set(medio.nombre, []);
      }

      if (medio.proveedores && medio.proveedores.length > 0) {
        // Si tiene proveedores, agregar cada proveedor como un item
        medio.proveedores.forEach(proveedor => {
          mediosAgrupados.get(medio.nombre)!.push({
            planMedioItemId: proveedor.planMedioItemId,
            proveedor: proveedor.nombre,
            canal: proveedor.canal,
            valorTotal: proveedor.valorNeto
          });
        });
      } else {
        // Si no tiene proveedores, agregar el medio directamente
        mediosAgrupados.get(medio.nombre)!.push({
          planMedioItemId: medio.planMedioItemId,
          proveedor: medio.proveedor || 'Sin proveedor',
          canal: medio.canal || 'Sin canal',
          valorTotal: medio.valorNeto
        });
      }
    });

    // Convertir el Map a un objeto para el modal
    const mediosActivos = Array.from(mediosAgrupados.keys());
    const itemsPorMedio = Object.fromEntries(mediosAgrupados);



    const dialogRef = this.dialog.open(ModalEliminarMediosComponent, {
      width: '700px',
      data: {
        mediosActivos,
        itemsPorMedio
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.mediosEliminados && result.mediosEliminados.length > 0) {
        // Actualizar la vista después de eliminar
        this.snackBar.open(
          `Se eliminaron ${result.totalEliminados} medios exitosamente`, 
          'Cerrar', 
          { duration: 3000 }
        );
        
        // Limpiar localStorage para compatibilidad temporal
        const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
        const pautasActualizadas = pautas.filter((pauta: any) => {
          const medioEliminado = result.mediosEliminados.find((m: any) => 
            m.planMedioItemId === pauta.planMedioItemId
          );
          return !medioEliminado;
        });
        localStorage.setItem('respuestasPautas', JSON.stringify(pautasActualizadas));

        // Recargar los datos completos
        this.verificarYRecargarDatos();
        
        // Recalcular totales
        this.actualizarTotalesPeriodo();
      }
    });
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
          <span>{{ medioExistente.medio }} - {{ medioExistente.proveedor }} - {{ medioExistente.canalNombre || medioExistente.canal }} (Tarifa: {{ medioExistente.tarifa | currency:'USD':'symbol':'1.2-2' }})</span>
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
              <mat-select formControlName="medio" (selectionChange)="onMedioChange($event.value)" [disabled]="cargandoMedios">
                <mat-option *ngFor="let medio of mediosDisponibles" [value]="medio">
                  {{ medio.nombre }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="cargandoMedios">Cargando medios...</mat-hint>
              <mat-error *ngIf="medioForm.get('medio')?.hasError('required')">
                El medio es obligatorio
              </mat-error>
            </mat-form-field>

            <mat-form-field class="full-width" *ngIf="medioForm.get('medio')?.value">
              <mat-label>Seleccionar Proveedor</mat-label>
              <mat-select formControlName="proveedor" [disabled]="cargandoProveedores">
                <mat-option *ngFor="let proveedor of proveedoresFiltrados" [value]="proveedor.id">
                  {{ proveedor.VENDOR }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="cargandoProveedores">Cargando proveedores...</mat-hint>
              <mat-hint *ngIf="!cargandoProveedores && proveedoresFiltrados.length === 0 && proveedoresDisponibles.length > 0">
                Todos los proveedores de este medio ya están agregados
              </mat-hint>
              <mat-error *ngIf="medioForm.get('proveedor')?.hasError('required')">
                El proveedor es obligatorio
              </mat-error>
            </mat-form-field>

            <mat-form-field class="full-width" *ngIf="medioForm.get('proveedor')?.value">
              <mat-label>Seleccionar Canal</mat-label>
              <mat-select formControlName="canal">
                <mat-option *ngFor="let canal of canalesDisponibles" [value]="canal.canalId">
                  {{ canal.nombre }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="cargandoCanales">Cargando canales...</mat-hint>
              <mat-hint *ngIf="!cargandoCanales && canalesDisponibles.length === 0">
                No hay canales disponibles para este proveedor
              </mat-hint>
              <mat-error *ngIf="medioForm.get('canal')?.hasError('required')">
                El canal es obligatorio
              </mat-error>
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>Tarifa</mat-label>
              <input matInput type="number" formControlName="tarifa" step="0.01" min="0.01">
              <mat-error *ngIf="medioForm.get('tarifa')?.hasError('required')">
                La tarifa es obligatoria
              </mat-error>
              <mat-error *ngIf="medioForm.get('tarifa')?.hasError('min')">
                La tarifa debe ser mayor a 0
              </mat-error>
            </mat-form-field>

            <!-- Mensaje de validación de duplicado -->
            <div class="validation-message" *ngIf="existeCombinacion">
              <mat-icon color="warn">warning</mat-icon>
              <span>Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan</span>
            </div>

            <!-- Mensaje de validación de formulario -->
            <div class="validation-message" *ngIf="medioForm.invalid && medioForm.touched">
              <mat-icon color="warn">error</mat-icon>
              <span>Por favor completa todos los campos obligatorios</span>
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
  mediosDisponibles: MedioBackend[] = []; // Cambiar a array de MedioBackend
  proveedoresDisponibles: any[] = []; // Mantener compatibilidad
  proveedoresFiltrados: any[] = []; // Mantener compatibilidad
  mediosExistentes: any[] = [];
  existeCombinacion: boolean = false;
  numSemanas: number = 5; // Por defecto 5 semanas
  cargandoMedios: boolean = true;
  cargandoProveedores: boolean = false;
  
  // Canales disponibles
  canalesDisponibles: any[] = [];
  cargandoCanales: boolean = false;

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaPautaService,
    private backendMediosService: BackendMediosService,
    private dialogRef: MatDialogRef<ModalAgregarMedioComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.medioForm = this.fb.group({
      medio: ['', [Validators.required]],
      proveedor: ['', [Validators.required]],
      canal: ['', [Validators.required]],
      tarifa: [0, [Validators.required, Validators.min(0.01)]]
    });

    // Suscribirse a cambios del proveedor para cargar canales
    this.medioForm.get('proveedor')?.valueChanges.subscribe(proveedor => {
      if (proveedor) {
        this.cargarCanalesPorProveedor(proveedor);
      } else {
        this.canalesDisponibles = [];
      }
    });
  }

  ngOnInit(): void {
    // Inicializar número de semanas desde los datos recibidos
    if (this.data.numSemanas) {
      this.numSemanas = this.data.numSemanas;
    }

    // Cargar medios desde el backend
    this.cargarMediosDesdeBackend();

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
    console.log('🔍 Cargando medios existentes:', this.data.mediosExistentes);
    
    if (this.data.mediosExistentes && this.data.mediosExistentes.length > 0) {
      // No filtramos por planMedioItemId ya que necesitamos mostrar todos los medios
      this.mediosExistentes = this.data.mediosExistentes;
      console.log('✅ Medios existentes cargados:', this.mediosExistentes.length, 'medios');
    } else {
      this.mediosExistentes = [];
      console.log('⚠️ No hay medios existentes o el array está vacío');
    }
  }

  onMedioChange(medio: MedioBackend): void {
    if (medio && medio.medioId) {
      this.cargandoProveedores = true;
      this.backendMediosService.getProveedoresPorMedio(medio.medioId).subscribe(
        (proveedoresBackend: ProveedorBackend[]) => {

          // Convertir proveedores del backend a formato compatible
          this.proveedoresDisponibles = proveedoresBackend.map(p => ({
            id: p.proveedorId.toString(),
            VENDOR: p.nombreProveedor,
            proveedorId: p.proveedorId,
            nombreProveedor: p.nombreProveedor,
            grupoProveedor: p.grupoProveedor,
            tipoProveedor: p.tipoProveedor,
            orionBeneficioReal: p.orionBeneficioReal,
            estado: p.estado
          }));

          this.filtrarProveedoresDisponibles(medio.nombre);
          this.cargandoProveedores = false;
        },
        (error: any) => {
          console.error('❌ Error cargando proveedores del backend:', error);
          this.proveedoresDisponibles = [];
          this.cargandoProveedores = false;
          
          // Mostrar error al usuario
          this.snackBar.open('❌ Error cargando proveedores desde el servidor', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      );

      this.medioForm.patchValue({ proveedor: '', canal: '', tarifa: 0 });
    }
  }

  cargarCanalesPorProveedor(proveedorId: string): void {
    this.cargandoCanales = true;
    this.backendMediosService.getCanalesPorProveedor(Number(proveedorId)).subscribe({
      next: (canales) => {
        // Filtrar canales que ya están en uso para este medio y proveedor
        const medioSeleccionado = this.medioForm.get('medio')?.value as MedioBackend;
        if (medioSeleccionado) {
          const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === proveedorId);
          const canalesEnUso = this.mediosExistentes
            .filter(me => {
              const coincideMedio = me.medio === medioSeleccionado.nombre;
              const coincideProveedor = me.proveedor === proveedorSeleccionado?.VENDOR;
              return coincideMedio && coincideProveedor;
            })
            .map(me => me.canalId);
          
          this.canalesDisponibles = canales.filter(canal => !canalesEnUso.includes(canal.canalId));
        } else {
          this.canalesDisponibles = canales;
        }

        this.cargandoCanales = false;
      },
      error: (error) => {
        console.error('❌ Error cargando canales:', error);
        this.canalesDisponibles = [];
        this.cargandoCanales = false;
        this.snackBar.open('❌ Error cargando canales desde el servidor', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Método para cargar medios desde el backend
  private cargarMediosDesdeBackend(): void {
    this.cargandoMedios = true;
    this.backendMediosService.getMedios().subscribe(
      (medios: MedioBackend[]) => {
        this.mediosDisponibles = medios.filter(m => m.estado); // Solo medios activos
        this.cargandoMedios = false;
      },
      (error: any) => {
        console.error('❌ Error cargando medios del backend:', error);
        this.mediosDisponibles = [];
        this.cargandoMedios = false;
        
        // Mostrar error al usuario
        this.snackBar.open('❌ Error cargando medios desde el servidor', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    );
  }

  private filtrarProveedoresDisponibles(nombreMedio: string): void {
    // No filtramos proveedores ya que un mismo proveedor puede tener diferentes canales
    this.proveedoresFiltrados = this.proveedoresDisponibles;


  }

  private validarCombinacionDuplicada(): void {
    const valores = this.medioForm.value;

    if (valores.medio && valores.proveedor && valores.canal) {
      const medioSeleccionado = valores.medio as MedioBackend;
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      const canalSeleccionado = this.canalesDisponibles.find(c => c.canalId === valores.canal);

      if (proveedorSeleccionado && medioSeleccionado && canalSeleccionado) {
                // Verificar si existe la combinación exacta de medio-proveedor-canal
        this.existeCombinacion = this.mediosExistentes.some(me => {
          return me.medio === medioSeleccionado.nombre &&
                 me.proveedor === proveedorSeleccionado.VENDOR &&
                 me.canalId === valores.canal;
        });

        if (this.existeCombinacion) {
          const medioConflicto = this.mediosExistentes.find(me =>
            me.medio === medioSeleccionado.nombre &&
            me.proveedor === proveedorSeleccionado.VENDOR &&
            me.canalId === valores.canal
          );
        }
      }
    } else {
      this.existeCombinacion = false;
    }
  }

  guardarMedio(): void {
    debugger;
    // Marcar todos los campos como tocados para mostrar errores
    this.medioForm.markAllAsTouched();

    // Validar campos obligatorios
    if (this.medioForm.invalid) {
      let mensajeError = 'Por favor completa todos los campos obligatorios:';
      
      if (this.medioForm.get('medio')?.hasError('required')) {
        mensajeError += ' Medio';
      }
      if (this.medioForm.get('proveedor')?.hasError('required')) {
        mensajeError += ' Proveedor';
      }
      if (this.medioForm.get('canal')?.hasError('required')) {
        mensajeError += ' Canal';
      }
      if (this.medioForm.get('tarifa')?.hasError('required')) {
        mensajeError += ' Tarifa';
      }
      if (this.medioForm.get('tarifa')?.hasError('min')) {
        mensajeError = 'La tarifa debe ser mayor a 0';
      }

      this.snackBar.open(`❌ ${mensajeError}`, '', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validar combinación duplicada
    if (this.existeCombinacion) {
      this.snackBar.open('❌ Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const valores = this.medioForm.value;
    const medioSeleccionado = valores.medio as MedioBackend;
    const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
    const canalSeleccionado = this.canalesDisponibles.find(c => c.canalId === valores.canal);

    // Validar que se hayan seleccionado medio, proveedor y canal
    if (!medioSeleccionado || !proveedorSeleccionado || !canalSeleccionado) {
      this.snackBar.open('❌ Error: Medio, proveedor o canal no encontrado', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Verificar una vez más antes de guardar
    const combinacionExiste = this.mediosExistentes.some(me =>
      me.medio === medioSeleccionado.nombre &&
      me.proveedor === proveedorSeleccionado?.VENDOR &&
      me.canalId === valores.canal &&
      Math.abs(me.tarifa - valores.tarifa) < 0.01
    );

    if (combinacionExiste) {
      this.snackBar.open('❌ Ya existe un registro con esta combinación de Medio-Proveedor-Canal', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Preparar request para el backend
    const crearRequest: CrearPlanMedioItemRequest = {
      planMedioId: Number(this.data.planData.id), // ID del plan
      version: Number(this.data.planData.version || 1), // Versión del plan
      medioId: medioSeleccionado.medioId,
      proveedorId: Number(valores.proveedor),
      canalId: Number(valores.canal),
      tarifa: Number(valores.tarifa),
      dataJson: JSON.stringify({
        spotsPorFecha: {},
        totalSpots: 0,
        valorTotal: 0
      }),
      usuarioRegistro: 'SYSTEM' // TODO: Obtener usuario actual
    };



    // Guardar en el backend
    this.backendMediosService.crearPlanMedioItem(crearRequest).subscribe(
      (response: PlanMedioItemBackend) => {
        // LocalStorage solo para compatibilidad temporal (TODO: eliminar cuando todo esté migrado)
        const nuevaPauta: RespuestaPauta = {
          id: `pauta-${response.planMedioItemId}`,
          planId: this.data.planData.id,
          plantillaId: 'simple',
          paisFacturacion: 'Perú',
          medio: medioSeleccionado.nombre,
          proveedor: proveedorSeleccionado ? proveedorSeleccionado.VENDOR : 'Sin proveedor',
          proveedorId: valores.proveedor,
          canal: canalSeleccionado.nombre,
          canalId: valores.canal,
          planMedioItemId: response.planMedioItemId,
          datos: {
            tarifa: Number(valores.tarifa),
            spotsPorFecha: {}
          },
          fechaCreacion: response.fechaRegistro || new Date().toISOString(),
          fechaModificacion: response.fechaModificacion,
          valorTotal: 0,
          valorNeto: 0,
          totalSpots: 0,
          diasSeleccionados: [],
          totalDiasSeleccionados: 0,
          semanas: new Array(this.numSemanas).fill(true) // Agregamos el array de semanas
        };

        // Obtener pautas existentes o inicializar array vacío
        let pautasExistentes: RespuestaPauta[] = [];
        try {
          const pautasStr = localStorage.getItem('respuestasPautas');
          if (pautasStr) {
            pautasExistentes = JSON.parse(pautasStr);
          }
        } catch (error) {
          console.error('Error al leer pautas del localStorage:', error);
        }

        // Agregar nueva pauta y guardar
        pautasExistentes.push(nuevaPauta);
        try {
          localStorage.setItem('respuestasPautas', JSON.stringify(pautasExistentes));

        } catch (error) {
          console.error('Error al guardar en localStorage:', error);
        }

        this.snackBar.open('✅ Medio agregado correctamente', '', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });

        this.dialogRef.close({ shouldRefresh: true });
      },
      (error: any) => {
        console.error('❌ Error creando PlanMedioItem en backend:', error);

        // Error en backend - no se puede agregar el medio
        this.snackBar.open('❌ Error al agregar medio en el servidor', '', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });

        // No cerrar el diálogo en caso de error para que el usuario pueda intentar de nuevo
      }
    );
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
          <span class="label">Tarifa:</span>
          <span class="value">{{ data.medio.tarifa | currency:'USD':'symbol':'1.2-2' }}</span>
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
  ) { }

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
          <span class="label">Proveedor:</span>
          <span class="value">{{ data.medio.proveedor }}</span>
        </div>
        <div class="info-item">
          <span class="label">Canal:</span>
          <span class="value">{{ data.medio.canal || 'Sin canal' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Tarifa Actual:</span>
          <span class="value">{{ data.medio.tarifa | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <form [formGroup]="editarForm">
        <mat-form-field class="full-width">
          <mat-label>Tarifa</mat-label>
          <input matInput type="number" formControlName="tarifa" step="0.01" min="0.01">
          <mat-error *ngIf="editarForm.get('tarifa')?.hasError('required')">
            La tarifa es obligatoria
          </mat-error>
          <mat-error *ngIf="editarForm.get('tarifa')?.hasError('min')">
            La tarifa debe ser mayor a 0
          </mat-error>
        </mat-form-field>

        <div class="validation-message" *ngIf="existeCombinacion">
          <mat-icon color="warn">warning</mat-icon>
          <span>Esta tarifa ya existe para este medio-proveedor-canal</span>
        </div>

        <!-- Mensaje de validación de formulario -->
        <div class="validation-message" *ngIf="editarForm.invalid && editarForm.touched">
          <mat-icon color="warn">error</mat-icon>
          <span>Por favor completa todos los campos obligatorios</span>
        </div>

        <!-- Mensaje de advertencia sobre reinicio de spots -->
        <div class="info-message" *ngIf="editarForm.get('tarifa')?.dirty">
          <mat-icon color="accent">info</mat-icon>
          <span>Al cambiar la tarifa se reiniciarán todos los spots a 0 y se guardará automáticamente</span>
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
        {{ editarForm.get('tarifa')?.dirty ? 'Actualizar Tarifa (Reiniciará Spots)' : 'Actualizar Tarifa' }}
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
      display: grid;
      grid-template-columns: 1fr 1fr;
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

    .info-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      font-size: 14px;
      margin-top: 8px;
      padding: 8px 12px;
      background-color: #e3f2fd;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    }

    .info-message mat-icon {
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
export class ModalEditarMedioComponent implements OnInit {
  editarForm!: FormGroup;
  existeCombinacion: boolean = false;
  mediosExistentes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private backendMediosService: BackendMediosService,
    private dialogRef: MatDialogRef<ModalEditarMedioComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.editarForm = this.fb.group({
      tarifa: [data.medio.tarifa || 0, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
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

    if (valores.tarifa > 0) {
      // Verificar si existe la combinación exacta de medio-proveedor-canal-tarifa (excluyendo el item actual)
      this.existeCombinacion = this.mediosExistentes.some(me =>
        me.medio === this.data.medio.nombre &&
        me.proveedor === this.data.medio.proveedor &&
        Math.abs(me.tarifa - valores.tarifa) < 0.01 &&
        // Excluir el medio actual de la validación
        !(me.proveedor === this.data.medio.proveedor && me.tarifa === this.data.medio.tarifa)
      );
    } else {
      this.existeCombinacion = false;
    }
  }

  guardarCambios(): void {
    console.log('🔄 INICIANDO GUARDADO DE CAMBIOS');
    console.log('📊 Datos del formulario:', this.editarForm.value);
    console.log('📊 Medio original:', this.data.medio);

    // Marcar todos los campos como tocados para mostrar errores
    this.editarForm.markAllAsTouched();

    // Validar campos obligatorios
    if (this.editarForm.invalid) {
      let mensajeError = 'Por favor completa todos los campos obligatorios';
      
      if (this.editarForm.get('tarifa')?.hasError('required')) {
        mensajeError = 'La tarifa es obligatoria';
      }
      if (this.editarForm.get('tarifa')?.hasError('min')) {
        mensajeError = 'La tarifa debe ser mayor a 0';
      }

      this.snackBar.open(`❌ ${mensajeError}`, '', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validar combinación duplicada
    if (this.existeCombinacion) {
      this.snackBar.open('❌ Esta combinación de Medio-Proveedor-Canal-Tarifa ya existe en el plan', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const valores = this.editarForm.value;
    console.log('📊 Valores del formulario:', valores);
    console.log('📊 Medio actual:', this.data.medio);

    // Verificar que tenemos el planMedioItemId para actualizar en el backend
    if (this.data.medio.planMedioItemId) {
      console.log('📊 ACTUALIZANDO DIRECTAMENTE EN BACKEND');
      console.log('📊 planMedioItemId:', this.data.medio.planMedioItemId);
      console.log('📊 Nueva tarifa:', valores.tarifa);

              // Actualizar directamente en el backend usando el método correcto (PUT)
        const updateDto: PlanMedioItemUpdateDto = {
          planMedioItemId: this.data.medio.planMedioItemId,
          planMedioId: Number(this.data.planId),
          version: this.data.resumenPlan?.version || 1,
          medioId: this.data.medio.medioId || 1, // TODO: Obtener medioId real desde el backend
          proveedorId: this.data.medio.proveedorId, // Usar el proveedor existente
          tarifa: Number(valores.tarifa),
          dataJson: JSON.stringify({
            spotsPorFecha: {}, // Reiniciar spots a vacío
            totalSpots: 0, // Reiniciar spots a 0
            valorTotal: 0 // Reiniciar valor total a 0
          }),
          usuarioModifico: 'SYSTEM' // TODO: Obtener usuario actual
        };

      console.log('📤 ENVIANDO REQUEST AL BACKEND (PUT UPDATE):', updateDto);
      console.log('📤 URL del servicio:', 'updatePlanMedioItem');
      console.log('📤 Datos a enviar:', JSON.stringify(updateDto, null, 2));

      this.backendMediosService.updatePlanMedioItem(updateDto).subscribe(
        (response: PlanMedioItemBackend) => {
          

          this.snackBar.open('✅ Tarifa actualizada y spots reiniciados automáticamente', '', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });

          this.dialogRef.close({ 
            shouldRefresh: true, 
            medioActualizado: true,
            nuevaTarifa: Number(valores.tarifa),
            medioActualizadoId: this.data.medio.planMedioItemId
          });
        },
        (error: any) => {
          console.error('❌ ERROR COMPLETO DEL BACKEND:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Message:', error.message);
          console.error('❌ Error body:', error.error);

          this.snackBar.open('❌ Error actualizando tarifa en el servidor', '', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      );
    } else {
      this.snackBar.open('❌ Error: No se puede actualizar - falta ID del medio', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
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
          <span class="label">Canal:</span>
          <span class="value">{{ data.medio.canal }}</span>
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
    private backendMediosService: BackendMediosService,
    private dialogRef: MatDialogRef<ModalConfirmarEliminacionComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  confirmarEliminacion(): void {
    // Obtener planMedioItemId desde el medio directamente
    const planMedioItemId = this.data.medio.planMedioItemId;
    
    if (!planMedioItemId) {
      console.error('❌ No se encontró planMedioItemId en el medio:', this.data.medio);
      this.snackBar.open('❌ Error: No se puede eliminar el medio', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    console.log('📤 Eliminando PlanMedioItem del backend ID:', planMedioItemId);

    this.backendMediosService.eliminarPlanMedioItem(planMedioItemId).subscribe(
      (response) => {
        

        if (response.success) {
          // Eliminar también de localStorage
          this.eliminarDeLocalStorage();

          this.snackBar.open('✅ Medio eliminado correctamente', '', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });

          this.dialogRef.close({ shouldRefresh: true });
        } else {
          console.error('❌ Backend reportó error:', response.message);
          this.snackBar.open(`❌ Error: ${response.message}`, '', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      },
      (error: any) => {
        console.error('❌ Error eliminando PlanMedioItem del backend:', error);
        this.snackBar.open('❌ Error eliminando medio del servidor', '', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    );
  }

  private eliminarDeLocalStorage(): void {
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasFiltradas = pautas.filter((pauta: any) => {
      // Si el medio tiene planMedioItemId, filtrar por ese ID
      if (this.data.medio.planMedioItemId && pauta.planMedioItemId) {
        return pauta.planMedioItemId !== this.data.medio.planMedioItemId;
      }
      // Fallback: filtrar por planId, medio y proveedor
      return !(pauta.planId === this.data.planId &&
        pauta.medio === this.data.medio.nombre &&
        pauta.proveedor === this.data.medio.proveedor);
    });

    localStorage.setItem('respuestasPautas', JSON.stringify(pautasFiltradas));
    console.log('🧹 Medio eliminado de localStorage');
  }
}

// Componente Modal para Confirmar Cambios Pendientes
@Component({
  selector: 'app-modal-confirmar-cambios-pendientes',
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
        Cambios Sin Guardar
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="warning-message">
        <mat-icon color="warn">edit</mat-icon>
        <div class="message-text">
          <p class="main-message">Tienes cambios sin guardar en el resumen</p>
          <p class="sub-message">{{ obtenerMensajeAccion() }}</p>
        </div>
      </div>

      <div class="options-info">
        <div class="option-item">
          <mat-icon color="primary">save</mat-icon>
          <span><strong>Guardar y Salir:</strong> Guarda todos los cambios antes de salir</span>
        </div>
        <div class="option-item">
          <mat-icon color="warn">exit_to_app</mat-icon>
          <span><strong>Salir sin Guardar:</strong> Descarta todos los cambios</span>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>
        <mat-icon>cancel</mat-icon>
        Cancelar
      </button>
      <button mat-button color="warn" (click)="continuar()">
        <mat-icon>exit_to_app</mat-icon>
        Salir sin Guardar
      </button>
      <button mat-raised-button color="primary" (click)="guardarYSalir()">
        <mat-icon>save</mat-icon>
        Guardar y Salir
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
      background: linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%);
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e65100;
    }

    .modal-content {
      padding: 20px;
      min-width: 350px;
    }

    .warning-message {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .warning-message mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .message-text {
      flex: 1;
      
      .main-message {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 8px 0;
      }
      
      .sub-message {
        font-size: 14px;
        color: #666;
        margin: 0;
        line-height: 1.4;
      }
    }

    .options-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      
      span {
        font-size: 14px;
        color: #333;
        
        strong {
          color: #1976d2;
        }
      }
    }

    .modal-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: #fafafa;
    }

    .modal-actions button {
      display: flex;
      align-items: center;
      gap: 6px;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
  `]
})
export class ModalConfirmarCambiosPendientesComponent {
  constructor(
    private dialogRef: MatDialogRef<ModalConfirmarCambiosPendientesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  obtenerMensajeAccion(): string {
    const mensajes: { [key: string]: string } = {
      'agregar-medio': 'Si agregas un nuevo medio, perderás los cambios de spots no guardados.',
      'descarga-flow': 'Si descargas el FlowChart, perderás los cambios de spots no guardados.',
      'aprobar-plan': 'Si apruebas el plan, perderás los cambios de spots no guardados.',
      'exportar-pdf': 'Si exportas el PDF, perderás los cambios de spots no guardados.',
      'navegar-mes-anterior': 'Si navegas al mes anterior, perderás los cambios de spots no guardados.',
      'navegar-mes-siguiente': 'Si navegas al mes siguiente, perderás los cambios de spots no guardados.',
      'cambiar-periodo': 'Si cambias de período, perderás los cambios de spots no guardados.',
      'acciones-medio': 'Si realizas acciones en el medio, perderás los cambios de spots no guardados.',
      'default': 'Si continúas con esta acción, perderás todos los cambios realizados en los spots.'
    };

    return mensajes[this.data?.ruta] || mensajes['default'];
  }

  guardarYSalir(): void {
    this.dialogRef.close({ accion: 'guardar' });
  }

  continuar(): void {
    this.dialogRef.close({ accion: 'continuar' });
  }
} 