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

interface FilaMedio {
  tipo: 'nombre' | 'salidas' | 'valor' | 'encabezado-medio' | 'spots' | 'inversiones';
  medio?: MedioPlan;
  nombre?: string;
  salidas?: number;
  valorNeto?: number;
  valorMensual?: number;
  totalSpots?: number;
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
  periodoSeleccionado!: PeriodoPlan;
  resumenPlan!: ResumenPlan;
  displayedColumns: string[] = ['medio', 'proveedor', 'semanas', 'valor-mensual', 'total', 'soi'];
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

    /*
     * FLUJO ÚNICO Y SIMPLE:
     * 1. Modal de consulta → navega con planId y version
     * 2. Consultar servicio getPlanMedioItemsPorPlan(planId, version)
     * 3. Si hay datos → mostrar en resumen
     * 4. Si no hay datos → resumen vacío para llenar
     */
    if (planData && planData.id) {
      // Guardar el ID del plan
      this.planId = planData.id;

      // Inicializar resumen con datos básicos del plan
      this.resumenPlan = {
        numeroPlan: planData.numeroPlan,
        version: Number(planData.version),
        cliente: planData.cliente,
        producto: planData.producto,
        campana: planData.campana,
        fechaInicio: planData.fechaInicio,
        fechaFin: planData.fechaFin,
        periodos: []
      };
      this.periodos = [];

      // Consultar servicio con planId y version
      console.log('🔄 Iniciando carga de datos desde backend...');
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
    } else {
      // Si no hay períodos, esperar a que se carguen asíncronamente
      console.log('ℹ️ Configurando resumen - esperando carga asíncrona de datos del servidor...');
    }
  }

  ngOnInit(): void {
    // Forzar una recarga al inicializar para asegurar que los datos estén actualizados
    this.verificarYRecargarDatos();

    // Eliminar notificación inicial que causa confusión
    // El usuario verá la carga asíncrona naturalmente
  }

  private verificarYRecargarDatos(): void {
    // Si tenemos un planId, verificar que los datos estén cargados correctamente
    if (this.planId) {
      // Verificar si hay medios cargados
      const tieneMedias = this.periodoSeleccionado && this.periodoSeleccionado.medios && this.periodoSeleccionado.medios.length > 0;

      // Verificar la integridad de los datos en localStorage
      this.verificarIntegridadDatos();

      // Si no hay medios, intentar recargar
      if (!tieneMedias) {
        this.recargarResumen();
      }
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
      // ✅ SIEMPRE agregar fila de encabezado del medio (incluso con un solo proveedor)
      // Calcular totales de la agrupación
      const valorTotalAgrupacion = mediosDelGrupo.reduce((total, medio) => total + medio.valorNeto, 0);
      const valorMensualAgrupacion = mediosDelGrupo.reduce((total, medio) => total + this.calcularValorMensual(medio), 0);
      const spotsAgrupacion = mediosDelGrupo.reduce((total, medio) => total + this.calcularSpotsMensual(medio), 0);
      const soiAgrupacion = spotsAgrupacion > 0 ? Math.round(valorMensualAgrupacion / spotsAgrupacion) : 0;

      filas.push({
        tipo: 'encabezado-medio',
        nombre: nombreMedio,
        semanas: [],
        soi: soiAgrupacion,
        valorNeto: valorTotalAgrupacion,
        valorMensual: valorMensualAgrupacion,
        totalSpots: spotsAgrupacion
      });

      // Agregar filas para cada proveedor del medio
      mediosDelGrupo.forEach(medio => {
        // Fila del proveedor (va en la columna PROVEEDOR)
        filas.push({
          tipo: 'nombre',
          medio: { ...medio },
          nombre: medio.proveedor || 'Sin proveedor',
          semanas: medio.semanas,
          soi: medio.soi
        });

        // Fila de spots del proveedor
        filas.push({
          tipo: 'spots',
          medio: { ...medio },
          nombre: 'SPOTS'
        });

        // Fila de inversiones del proveedor
        filas.push({
          tipo: 'inversiones',
          medio: { ...medio },
          nombre: 'INVERSIONES'
        });
      });
    });

    this.dataSource = filas;

    // Establecer variable CSS para el número de semanas
    this.establecerVariableCSSNumSemanas();
    
    console.log('📊 DataSource preparado con', this.dataSource.length, 'filas');
    
    // Log para verificar que las tarifas están actualizadas
    this.periodoSeleccionado.medios.forEach(medio => {
      console.log(`📊 Medio: ${medio.nombre}, Proveedor: ${medio.proveedor}, Tarifa: $${medio.tarifa}`);
    });
  }



  private establecerVariableCSSNumSemanas(): void {
    const numSemanas = this.semanasColumnas.length;
    document.documentElement.style.setProperty('--num-semanas', numSemanas.toString());
    console.log(`📊 Establecida variable CSS --num-semanas: ${numSemanas}`);
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
      console.log('⬅️ Navegado al mes anterior:', this.mesActual.nombre);
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
      console.log('➡️ Navegado al mes siguiente:', this.mesActual.nombre);
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

    console.log('📅 Meses disponibles:', this.mesesDisponibles);
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

    console.log('📅 Calculando semanas para mes:', this.mesActual.nombre, {
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    });

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

    console.log('📅 Semanas completas calculadas:', {
      inicioSemanaCompleta: this.formatearFecha(inicioSemana),
      finSemanaCompleta: this.formatearFecha(finPlan),
      fechaOriginalInicio: this.formatearFecha(fechaInicio),
      fechaOriginalFin: this.formatearFecha(fechaFin)
    });

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

      console.log(`📅 Semana ${contadorSemana}: ${this.formatearFecha(inicioSemana)} - ${this.formatearFecha(finSemana)}`);

      contadorSemana++;

      // Avanzar al próximo lunes
      inicioSemana.setDate(inicioSemana.getDate() + 7);
    }

    console.log('📅 Semanas completas calculadas para', this.mesActual.nombre, ':', this.semanasConFechas);
    console.log('📅 Columnas de semanas:', this.semanasColumnas);
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
        console.log('✏️ Acción: Editar medio con planMedioItemId:', medio.planMedioItemId);
        this.editarMedio(medio);
      } else if (result && result.accion === 'eliminar') {
        console.log('🗑️ Acción: Eliminar medio con planMedioItemId:', medio.planMedioItemId);
        this.eliminarMedio(medio);
      }
    });
  }

  private editarMedio(medio: any): void {
    console.log('🔄 ABRIENDO MODAL EDITAR MEDIO:', medio);
    
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
      console.log('📊 RESULTADO DEL MODAL:', result);
      
      if (result && result.shouldRefresh) {
        console.log('✅ Medio editado, recargando resumen');
        
        if (result.medioActualizado) {
          // Actualización específica para cambios de tarifa
          console.log('🔄 Actualizando vista para cambios de tarifa');
          
          // Actualizar inmediatamente la tarifa en el modelo local (para respuesta inmediata)
          this.actualizarTarifaEnModelo(result.medioActualizadoId || medio.planMedioItemId, result.nuevaTarifa);
          
          // Recargar datos desde el backend para obtener valores actualizados
          console.log('🔄 Recargando datos desde backend para confirmar cambios');
          this.recargarResumen();
          
          // Marcar que hay cambios para detectar cambios futuros
          this.cambiosPendientes = false;
        } else {
          // Recarga normal
          this.recargarResumen();
          this.cambiosPendientes = false;
        }
      }
    });
  }

  // Método para actualizar la tarifa directamente en el modelo local (temporal hasta que se recargue desde BD)
  private actualizarTarifaEnModelo(planMedioItemId: number, nuevaTarifa: number): void {
    if (!planMedioItemId || !nuevaTarifa) return;
    
    console.log('🔄 ACTUALIZANDO TARIFA EN MODELO LOCAL (TEMPORAL):', planMedioItemId, nuevaTarifa);
    
    // Buscar y actualizar en periodoSeleccionado
    const medioEncontrado = this.periodoSeleccionado.medios.find(m => m.planMedioItemId === planMedioItemId);
    if (medioEncontrado) {
      console.log('✅ Medio encontrado en modelo, actualizando tarifa temporalmente:', medioEncontrado.nombre);
      medioEncontrado.tarifa = nuevaTarifa;
      
      // Forzar actualización inmediata del dataSource
      this.prepararDataSource();
      console.log('✅ Tarifa actualizada temporalmente y dataSource refrescado');
    } else {
      console.log('❌ Medio no encontrado en modelo local');
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
        console.log('✅ Medio eliminado, recargando resumen');
        this.recargarResumen();
        
        // ✅ EJECUTAR GUARDAR RESUMEN AUTOMÁTICAMENTE DESPUÉS DE ELIMINAR
        console.log('💾 Ejecutando Guardar Resumen automáticamente tras eliminar medio...');
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
    console.log('🔄 Ejecutando descarga FlowChart');
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
        console.log('🔄 Navegando a nueva pauta con plan data:', stateData);
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

    console.log('🔄 Cargando datos desde backend para plan:', planNumerico, 'versión:', versionNumerico);

    // Cargar de forma asíncrona desde el backend
    this.cargarDatosDesdeBackend(planNumerico, versionNumerico);
  }

  private cargarDatosDesdeBackend(planMedioId: number, version: number): void {
    console.log('🔄 CONSULTANDO BACKEND para plan:', planMedioId, 'versión:', version);
    
    this.cargandoDatos = true;
    this.backendMediosService.getPlanMedioItemsPorPlan(planMedioId, version).subscribe(
      (planMedioItems: PlanMedioItemBackend[]) => {
        console.log('📥 RESPUESTA COMPLETA DEL BACKEND:', planMedioItems);
        
        // Log detallado de cada item para verificar las tarifas
        planMedioItems.forEach((item, index) => {
          console.log(`📊 Item ${index + 1}:`, {
            planMedioItemId: item.planMedioItemId,
            medioNombre: item.medioNombre,
            proveedorNombre: item.proveedorNombre,
            tarifa: item.tarifa,
            dataJson: item.dataJson
          });
        });
        
        if (planMedioItems.length > 0) {
          const periodosConDatos = this.procesarPlanMedioItemsDesdeBackend(planMedioItems);
          this.resumenPlan.periodos = periodosConDatos;
          this.periodos = periodosConDatos;
          this.periodoSeleccionado = periodosConDatos[0];
          this.calcularMesesDisponibles();
          this.calcularSemanasConFechas();
          this.prepararDataSource();

          // Log de éxito sin notificación que pueda distraer
          console.log(`✅ Cargados exitosamente ${planMedioItems.length} medios desde servidor`);
          console.log('📊 DataSource actualizado con nuevos datos');
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

          // Log informativo sin notificación
          console.log('ℹ️ Plan sin medios cargado - listo para agregar medios');
          this.cargandoDatos = false;
        }
      },
      (error) => {
        console.error('❌ ERROR COMPLETO CARGANDO DATOS:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        console.error('❌ Error body:', error.error);
        
        // Crear período vacío funcional para poder agregar medios
        const periodoVacio = this.crearPeriodoVacio(this.resumenPlan.fechaInicio, this.resumenPlan.fechaFin);
        this.resumenPlan.periodos = [periodoVacio];
        this.periodos = [periodoVacio];
        this.periodoSeleccionado = periodoVacio;
        this.calcularMesesDisponibles();
        this.calcularSemanasConFechas();
        this.prepararDataSource();
        
        console.error('❌ Error cargando datos del servidor - Plan configurado para agregar medios');
        this.cargandoDatos = false;
      }
    );
  }

  private procesarPlanMedioItemsDesdeBackend(planMedioItems: PlanMedioItemBackend[]): PeriodoPlan[] {
    const fechaInicio = this.resumenPlan.fechaInicio;
    const fechaFin = this.resumenPlan.fechaFin;
    const periodoInfo = this.calcularPeriodo(fechaInicio, fechaFin);

    // Agrupar items por medio y proveedor
    const mediosMap = new Map<string, MedioPlan>();

    planMedioItems.forEach((item: PlanMedioItemBackend) => {
      const medio = item.medioNombre || 'Medio desconocido';
      const proveedor = item.proveedorNombre || 'Proveedor desconocido';
      const claveAgrupacion = `${medio}_${proveedor}`;

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
          
          console.log('✅ JSON parseado para', medio, proveedor, ':', {
            spotsPorFecha,
            totalSpots,
            valorTotal
          });
        } catch (error) {
          console.error('❌ Error parseando dataJson para', medio, proveedor, ':', error);
        }
      }

      // Si no hay data en JSON o totalSpots es 0, usar valores básicos de la tarifa
      if (totalSpots === 0) {
        totalSpots = 0; // Mantener 0 si no hay spots programados
        valorTotal = 0; // Mantener 0 si no hay spots programados
        console.log('ℹ️ No hay spots programados para', medio, proveedor);
      }

      // Generar semanas boolean basado en spots por fecha
      const semanasBoolean = this.generarSemanasBoolean();

      // Crear o actualizar el medio
      if (mediosMap.has(claveAgrupacion)) {
        const medioExistente = mediosMap.get(claveAgrupacion)!;
        medioExistente.salidas += totalSpots;
        medioExistente.valorNeto += valorTotal;
        medioExistente.soi = medioExistente.salidas > 0 ? Math.round(medioExistente.valorNeto / medioExistente.salidas) : 0;
        // Combinar spots por fecha
        medioExistente.spotsPorFecha = { ...medioExistente.spotsPorFecha, ...spotsPorFecha };
        // Mantener el planMedioItemId del primer item (importante para eliminación)
        if (!medioExistente.planMedioItemId) {
          medioExistente.planMedioItemId = item.planMedioItemId;
        }
      } else {
        const nuevoMedio = {
          nombre: medio,
          proveedor: proveedor,
          proveedorId: item.proveedorId.toString(),
          salidas: totalSpots,
          valorNeto: valorTotal,
          soi: totalSpots > 0 ? Math.round(valorTotal / totalSpots) : 0,
          semanas: semanasBoolean,
          tarifa: item.tarifa,
          spotsPorFecha: spotsPorFecha,
          planMedioItemId: item.planMedioItemId // Guardar referencia al backend
        };

        console.log('📊 CREANDO NUEVO MEDIO:', nuevoMedio);
        console.log('📊 Tarifa del medio:', item.tarifa);

        mediosMap.set(claveAgrupacion, nuevoMedio);
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
      // Recargar datos desde el backend
      const planNumerico = Number(this.planId);
      const version = this.resumenPlan.version;

      console.log('🔄 Recargando datos desde servidor...');
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

    console.log(`💾 Guardando resumen: ${totalMedios} medios por actualizar`);

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
            console.log('✅ Todos los medios actualizados correctamente');
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

  // Método para actualizar spots y recalcular inversiones
  onSpotsChange(medio: MedioPlan, semanaIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const nuevoSpots = parseInt(target.value) || 0;

    // Obtener la fecha específica de la semana
    const semanaActual = this.semanasConFechas[semanaIndex];
    if (!semanaActual) {
      console.error('No se encontró la semana en el índice:', semanaIndex);
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

    // Recalcular inversiones totales
    if (medio.tarifa) {
      medio.valorNeto = medio.salidas * medio.tarifa;
    }

    // Recalcular SOI
    medio.soi = medio.salidas > 0 ? Math.round(medio.valorNeto / medio.salidas) : 0;

    console.log(`🔄 ACTUALIZANDO SPOTS: ${medio.nombre} ${semanaActual.nombre}`);
    console.log(`📊 Valor antes: ${medio.valorNeto - (nuevoSpots * medio.tarifa)}`);
    console.log(`📊 Valor después: ${medio.valorNeto}`);
    console.log(`📊 Spots totales: ${medio.salidas}`);

    // Actualizar totales del período - esto recalcula todo el dataSource
    this.actualizarTotalesPeriodo();

    // Marcar que hay cambios pendientes
    this.cambiosPendientes = true;

    // *** GUARDADO AUTOMÁTICO DESHABILITADO ***
    // Ahora solo se guarda cuando el usuario presiona "Guardar Resumen"
    // if (medio.planMedioItemId) {
    //   this.actualizarSpotsEnBackend(medio);
    // }

    // Logs para debugging
    console.log(`✅ Spots actualizados para ${medio.nombre} ${semanaActual.nombre} (${fechaClave}): ${nuevoSpots}`);
    console.log(`✅ Nueva inversión total: ${medio.valorNeto}`);
    console.log(`✅ Spots por fecha:`, medio.spotsPorFecha);
    console.log(`⚠️ Cambios pendientes: ${this.cambiosPendientes}`);
  }

  // Método para actualizar spots en el backend
  private actualizarSpotsEnBackend(medio: MedioPlan): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!medio.planMedioItemId || !this.planId) {
        console.log('⚠️ No se puede actualizar en backend: falta planMedioItemId o planId');
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

      console.log('📤 Actualizando spots en backend:', actualizarRequest);

      this.backendMediosService.actualizarPlanMedioItem(actualizarRequest).subscribe(
        (response: PlanMedioItemBackend) => {
          console.log('✅ Spots actualizados en backend:', response);
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
    const totalInversionNeta = this.periodoSeleccionado.medios.reduce((total, medio) => total + medio.valorNeto, 0);
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
    console.log('🧹 Logs de debugging limpiados');
    this.snackBar.open('🧹 Logs de debugging limpiados', '', {
      duration: 1000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  // Método para debugging - mostrar estado actual del resumen
  mostrarEstadoResumen(): void {
    console.log('📊 === ESTADO ACTUAL DEL RESUMEN ===');
    console.log('✅ Plan ID:', this.planId);
    console.log('✅ Resumen Plan:', this.resumenPlan);
    console.log('✅ Período Seleccionado:', this.periodoSeleccionado);
    console.log('✅ Medios en período:', this.periodoSeleccionado?.medios || []);
    console.log('✅ DataSource:', this.dataSource);
    console.log('✅ Cambios Pendientes:', this.cambiosPendientes);
    console.log('📊 === FIN ESTADO RESUMEN ===');
  }

  // Método para mostrar información sobre la integración con el backend
  mostrarInfoBackend(): void {
    console.log('🔧 === INFORMACIÓN DE INTEGRACIÓN BACKEND ===');
    console.log('✅ Servicio de consulta integrado: /api/PlanMedioItem/by-plan/{id}/version/{version}');
    console.log('✅ Carga de datos desde backend implementada');
    console.log('✅ Parsing de dataJson para spots por fecha');
    console.log('✅ Actualización automática en backend al editar spots');
    console.log('✅ Eliminación de dependencia de localStorage');
    console.log('✅ Notificaciones de estado para todas las operaciones');
    console.log('🔧 === FIN INFORMACIÓN ===');

    this.snackBar.open('ℹ️ Integración backend completada - Ver consola para detalles', '', {
      duration: 3000,
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
      const spots = medio.spotsPorFecha?.[semana.fechaInicio] || 0;
      valorMensual += spots * (medio.tarifa || 0);
    });

    return valorMensual;
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

  // Método para calcular el IVA mensual
  calcularIvaMensual(): number {
    const inversionNetaMensual = this.calcularTotalInversionMensual();
    return Math.round(inversionNetaMensual * 0.19);
  }

  // Método para calcular el total mensual (inversión + IVA)
  calcularTotalMensual(): number {
    const inversionNetaMensual = this.calcularTotalInversionMensual();
    const ivaMensual = this.calcularIvaMensual();
    return inversionNetaMensual + ivaMensual;
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
      tarifa: [0, [Validators.required, Validators.min(0.01)]]
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
    // Priorizar datos del backend (desde el componente padre)
    if (this.data.mediosExistentes) {
      this.mediosExistentes = this.data.mediosExistentes;
      console.log('📋 Medios existentes cargados desde backend:', this.mediosExistentes);
    } else {
      // Fallback: cargar desde localStorage para compatibilidad temporal
      const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
      this.mediosExistentes = pautas
        .filter((pauta: any) => pauta.planId === this.data.planData.id)
        .map((pauta: any) => ({
          medio: pauta.medio,
          proveedor: pauta.proveedor,
          tarifa: pauta.datos?.tarifa || 0
        }));

      console.log('📋 Medios existentes cargados desde localStorage (fallback):', this.mediosExistentes);
    }
  }

  onMedioChange(medio: MedioBackend): void {
    if (medio && medio.medioId) {
      this.cargandoProveedores = true;
      console.log('🔄 Cargando proveedores para medio:', medio.nombre, 'ID:', medio.medioId);

      this.backendMediosService.getProveedoresPorMedio(medio.medioId).subscribe(
        (proveedoresBackend: ProveedorBackend[]) => {
          console.log('✅ Proveedores del backend obtenidos:', proveedoresBackend);

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

      this.medioForm.patchValue({ proveedor: '', tarifa: 0 });
    }
  }

  // Método para cargar medios desde el backend
  private cargarMediosDesdeBackend(): void {
    this.cargandoMedios = true;
    console.log('🔄 Cargando medios desde el backend...');

    this.backendMediosService.getMedios().subscribe(
      (medios: MedioBackend[]) => {
        console.log('✅ Medios del backend obtenidos:', medios);
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
    // Obtener proveedores ya usados para este medio
    const proveedoresUsados = this.mediosExistentes
      .filter(me => me.medio === nombreMedio)
      .map(me => me.proveedor);

    // Filtrar proveedores disponibles excluyendo los ya usados
    this.proveedoresFiltrados = this.proveedoresDisponibles.filter(proveedor =>
      !proveedoresUsados.includes(proveedor.VENDOR)
    );

    console.log('🔍 Proveedores filtrados para', nombreMedio, ':', this.proveedoresFiltrados);
  }

  private validarCombinacionDuplicada(): void {
    const valores = this.medioForm.value;

    if (valores.medio && valores.proveedor && valores.tarifa > 0) {
      const medioSeleccionado = valores.medio as MedioBackend;
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);

      if (proveedorSeleccionado && medioSeleccionado) {
        // Verificar si existe la combinación exacta
        this.existeCombinacion = this.mediosExistentes.some(me =>
          me.medio === medioSeleccionado.nombre &&
          me.proveedor === proveedorSeleccionado.VENDOR &&
          Math.abs(me.tarifa - valores.tarifa) < 0.01 // Comparación con tolerancia para decimales
        );

        console.log('🔍 Validando combinación:', {
          medio: medioSeleccionado.nombre,
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

    // Validar que se hayan seleccionado medio y proveedor
    if (!medioSeleccionado || !proveedorSeleccionado) {
      this.snackBar.open('❌ Error: Medio o proveedor no encontrado', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Verificar una vez más antes de guardar
    const combinacionExiste = this.mediosExistentes.some(me =>
      me.medio === medioSeleccionado.nombre &&
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

    // Preparar request para el backend
    const crearRequest: CrearPlanMedioItemRequest = {
      planMedioId: Number(this.data.planData.id), // ID del plan
      version: Number(this.data.planData.version || 1), // Versión del plan
      medioId: medioSeleccionado.medioId,
      proveedorId: Number(valores.proveedor),
      tarifa: Number(valores.tarifa),
      dataJson: JSON.stringify({
        spotsPorFecha: {},
        totalSpots: 0,
        valorTotal: 0
      }),
      usuarioRegistro: 'SYSTEM' // TODO: Obtener usuario actual
    };

    console.log('📤 Enviando request al backend:', crearRequest);

    // Guardar en el backend
    this.backendMediosService.crearPlanMedioItem(crearRequest).subscribe(
      (response: PlanMedioItemBackend) => {
                  console.log('✅ PlanMedioItem creado en backend:', response);

          // LocalStorage solo para compatibilidad temporal (TODO: eliminar cuando todo esté migrado)
          const nuevaPauta: RespuestaPauta = {
            id: `pauta-${response.planMedioItemId}`,
            planId: this.data.planData.id,
            plantillaId: 'simple',
            paisFacturacion: 'Perú',
            medio: medioSeleccionado.nombre,
            proveedor: proveedorSeleccionado ? proveedorSeleccionado.VENDOR : 'Sin proveedor',
            proveedorId: valores.proveedor,
            planMedioItemId: response.planMedioItemId, // Agregar ID del backend
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
            totalDiasSeleccionados: 0
          };

          const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
          pautas.push(nuevaPauta);
          localStorage.setItem('respuestasPautas', JSON.stringify(pautas));
          console.log('ℹ️ Guardado en localStorage para compatibilidad temporal');

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
          <mat-select formControlName="proveedor" [disabled]="cargandoProveedores">
            <mat-option *ngFor="let proveedor of proveedoresDisponibles" [value]="proveedor.id">
              {{ proveedor.VENDOR }}
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="cargandoProveedores">Cargando proveedores...</mat-hint>
          <mat-error *ngIf="editarForm.get('proveedor')?.hasError('required')">
            El proveedor es obligatorio
          </mat-error>
        </mat-form-field>

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
          <span>Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan</span>
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
        {{ editarForm.get('tarifa')?.dirty ? 'Actualizar Tarifa (Reiniciará Spots)' : 'Guardar Cambios' }}
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
  proveedoresDisponibles: any[] = [];
  existeCombinacion: boolean = false;
  mediosExistentes: any[] = [];
  cargandoProveedores: boolean = false;
  medioActual: MedioBackend | null = null;

  constructor(
    private fb: FormBuilder,
    private backendMediosService: BackendMediosService,
    private dialogRef: MatDialogRef<ModalEditarMedioComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.editarForm = this.fb.group({
      proveedor: [data.medio.proveedorId || '', [Validators.required]],
      tarifa: [data.medio.tarifa || 0, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    this.cargarMediosExistentes();
    this.cargarProveedoresParaMedio();

    // Suscribirse a cambios en el formulario para validar duplicados
    this.editarForm.valueChanges.subscribe(() => {
      this.validarCombinacionDuplicada();
    });
  }

  private cargarProveedoresParaMedio(): void {
    this.cargandoProveedores = true;
    console.log('🔄 Cargando proveedores para medio:', this.data.medio.nombre);

    // Primero buscar el medio en el backend
    this.backendMediosService.getMedios().subscribe(
      (medios: MedioBackend[]) => {
        this.medioActual = medios.find(m => m.nombre === this.data.medio.nombre) || null;
        
        if (this.medioActual) {
          console.log('✅ Medio encontrado:', this.medioActual);
          
          // Cargar proveedores para este medio
          this.backendMediosService.getProveedoresPorMedio(this.medioActual.medioId).subscribe(
            (proveedoresBackend: ProveedorBackend[]) => {
              console.log('✅ Proveedores cargados para edición:', proveedoresBackend);

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

              this.cargandoProveedores = false;
            },
            (error) => {
              console.error('❌ Error cargando proveedores:', error);
              this.proveedoresDisponibles = [];
              this.cargandoProveedores = false;
            }
          );
        } else {
          console.warn('⚠️ No se encontró el medio en el backend');
          this.proveedoresDisponibles = [];
          this.cargandoProveedores = false;
        }
      },
      (error) => {
        console.error('❌ Error cargando medios:', error);
        this.proveedoresDisponibles = [];
        this.cargandoProveedores = false;
      }
    );
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
    console.log('🔄 INICIANDO GUARDADO DE CAMBIOS');
    console.log('📊 Datos del formulario:', this.editarForm.value);
    console.log('📊 Medio original:', this.data.medio);

    // Marcar todos los campos como tocados para mostrar errores
    this.editarForm.markAllAsTouched();

    // Validar campos obligatorios
    if (this.editarForm.invalid) {
      let mensajeError = 'Por favor completa todos los campos obligatorios:';
      
      if (this.editarForm.get('proveedor')?.hasError('required')) {
        mensajeError += ' Proveedor';
      }
      if (this.editarForm.get('tarifa')?.hasError('required')) {
        mensajeError += ' Tarifa';
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
      this.snackBar.open('❌ Esta combinación de Medio-Proveedor-Tarifa ya existe en el plan', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const valores = this.editarForm.value;
    const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);

    console.log('📊 Valores del formulario:', valores);
    console.log('📊 Proveedor seleccionado:', proveedorSeleccionado);

    // Validar que se haya seleccionado un proveedor
    if (!proveedorSeleccionado) {
      this.snackBar.open('❌ Error: Proveedor no encontrado', '', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

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
          proveedorId: Number(valores.proveedor),
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
          console.log('✅ RESPUESTA DEL BACKEND:', response);
          console.log('✅ Tarifa actualizada en backend:', response.tarifa);

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
        console.log('✅ PlanMedioItem eliminado del backend:', response);

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