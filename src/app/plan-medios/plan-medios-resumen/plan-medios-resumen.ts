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
import { BackendMediosService } from '../services/backend-medios.service';
import { MedioBackend, ProveedorBackend } from '../models/backend-models';
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
  displayedColumns: string[] = ['medio', 'proveedor', 'semanas', 'valor-mensual', 'total', 'soi'];
  semanasColumnas: string[] = []; // Ahora será dinámico
  semanasConFechas: Array<{nombre: string, fechaInicio: string, fechaFin: string, fechaCompacta: string}> = [];
  dataSource: FilaMedio[] = [];
  planId: string | undefined; // Almacenar el ID del plan
  // Variable eliminada: flowChartAsociado - ya no es necesaria
  
  // Propiedades para navegación por meses
  mesesDisponibles: Array<{nombre: string, anio: number, fechaInicio: string, fechaFin: string}> = [];
  mesActualIndex: number = 0;
  mesActual: {nombre: string, anio: number, fechaInicio: string, fechaFin: string} | null = null;

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
    console.log('📋 Plan Data tiene ID:', !!(planData && planData.id));
    console.log('📋 Plan Data ID:', planData?.id);
    
    // DEBUG: Verificar localStorage
    const planesMediosStorage = localStorage.getItem('planesMedios');
    const respuestasPautasStorage = localStorage.getItem('respuestasPautas');
    console.log('📋 localStorage planesMedios:', planesMediosStorage ? 'EXISTE' : 'NO EXISTE');
    console.log('📋 localStorage respuestasPautas:', respuestasPautasStorage ? 'EXISTE' : 'NO EXISTE');
    
    if (planesMediosStorage) {
      const planes = JSON.parse(planesMediosStorage);
      console.log('📋 Número de planes en localStorage:', planes.length);
      console.log('📋 IDs de planes disponibles:', planes.map((p: any) => p.id));
    }
    
    if (respuestasPautasStorage) {
      const pautas = JSON.parse(respuestasPautasStorage);
      console.log('📋 Número de pautas en localStorage:', pautas.length);
      console.log('📋 Plan IDs de pautas disponibles:', [...new Set(pautas.map((p: any) => p.planId))]);
    }

    if (planData && planData.id) {
      // Guardar el ID del plan
      this.planId = planData.id;
      console.log('📋 ID del plan guardado:', this.planId);
      
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
        console.log('🔍 DEBUG: Planes locales encontrados:', planesLocal.length);
        console.log('🔍 DEBUG: Buscando plan con ID:', planData.id);
        
        const planCompleto = planesLocal.find((plan: any) => plan.id === planData.id);
        console.log('🔍 DEBUG: Plan encontrado:', planCompleto ? 'SÍ' : 'NO');
        
        if (planCompleto) {
          console.log('🔍 DEBUG: Cargando períodos con pautas para plan:', planCompleto.id);
          const periodosReales = this.cargarPeriodosConPautas(planCompleto.id);
          console.log('🔍 DEBUG: Períodos cargados:', periodosReales);
          
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
          console.log('🔍 DEBUG: No se encontró plan, inicializando ejemplo');
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
    this.calcularMesesDisponibles();
    this.calcularSemanasConFechas();
    this.prepararDataSource();
    
    console.log('📋 Resumen final configurado:', this.resumenPlan);
    console.log('📋 Período seleccionado:', this.periodoSeleccionado);
  }

  ngOnInit(): void {
    // Forzar una recarga al inicializar para asegurar que los datos estén actualizados
    console.log('🔄 ngOnInit: Verificando carga de datos');
    this.verificarYRecargarDatos();
    
    // Mostrar notificación si no hay datos cargados
    if (this.planId && (!this.periodoSeleccionado?.medios || this.periodoSeleccionado.medios.length === 0)) {
      setTimeout(() => {
        this.snackBar.open('⚠️ No se encontraron datos. Use el botón "Recargar Datos" si es necesario.', 'OK', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar']
        });
      }, 1000);
    }
  }
  
  private verificarYRecargarDatos(): void {
    console.log('🔄 Verificando y recargando datos...');
    
    // Si tenemos un planId, verificar que los datos estén cargados correctamente
    if (this.planId) {
      console.log('🔄 Verificando datos para plan ID:', this.planId);
      
      // Verificar si hay medios cargados
      const tieneMedias = this.periodoSeleccionado && this.periodoSeleccionado.medios && this.periodoSeleccionado.medios.length > 0;
      console.log('🔄 Tiene medios cargados:', tieneMedias);
      
      // Verificar la integridad de los datos en localStorage
      this.verificarIntegridadDatos();
      
      // Si no hay medios, intentar recargar
      if (!tieneMedias) {
        console.log('🔄 No hay medios cargados, intentando recargar...');
        this.recargarResumen();
      } else {
        console.log('🔄 Medios ya cargados:', this.periodoSeleccionado.medios.length);
      }
    } else {
      console.log('🔄 No hay planId, no se puede recargar');
    }
  }
  
  private verificarIntegridadDatos(): void {
    if (!this.planId) return;
    
    console.log('🔍 Verificando integridad de datos en localStorage...');
    
    // Verificar que el plan existe en planesMedios
    const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
    const planExiste = planesLocal.some((plan: any) => plan.id === this.planId);
    console.log('🔍 Plan existe en planesMedios:', planExiste);
    
    // Verificar que hay pautas para este plan
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasDelPlan = pautas.filter((pauta: any) => pauta.planId === this.planId);
    console.log('🔍 Pautas encontradas para el plan:', pautasDelPlan.length);
    
    if (pautasDelPlan.length > 0) {
      console.log('🔍 Detalles de pautas:');
      pautasDelPlan.forEach((pauta: any, index: number) => {
        console.log(`🔍 Pauta ${index + 1}:`, {
          medio: pauta.medio,
          proveedor: pauta.proveedor,
          valorTotal: pauta.valorTotal,
          totalSpots: pauta.totalSpots,
          spotsPorFecha: pauta.datos?.spotsPorFecha
        });
      });
    }
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
    
    // Establecer variable CSS para el número de semanas
    this.establecerVariableCSSNumSemanas();
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
    this.periodoSeleccionado = periodo;
    this.calcularMesesDisponibles();
    this.calcularSemanasConFechas();
    this.prepararDataSource();
  }

  // Funciones de navegación por meses
  mesAnterior(): void {
    if (this.mesActualIndex > 0) {
      this.mesActualIndex--;
      this.mesActual = this.mesesDisponibles[this.mesActualIndex];
      this.calcularSemanasConFechas();
      this.prepararDataSource();
      console.log('⬅️ Navegado al mes anterior:', this.mesActual.nombre);
    }
  }

  mesSiguiente(): void {
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
    
    // Asegurar que las fechas se parseen correctamente
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);
    
    console.log('📅 Calculando semanas para mes:', this.mesActual.nombre, {
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
    
    // Si el lunes calculado es anterior a la fecha de inicio del mes, usar la fecha de inicio
    if (inicioSemana < fechaInicio) {
      inicioSemana = new Date(fechaInicio);
    }
    
    let contadorSemana = 1;
    
    // Generar semanas hasta cubrir todo el mes
    while (inicioSemana <= fechaFin) {
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6); // Domingo de la misma semana
      
      // Si la fecha fin de la semana supera la fecha fin del mes, ajustarla
      if (finSemana > fechaFin) {
        finSemana.setTime(fechaFin.getTime());
      }
      
      // Solo agregar si hay intersección con el mes
      if (inicioSemana <= fechaFin && finSemana >= fechaInicio) {
        // Ajustar fechas para que no salgan del rango del mes
        const fechaInicioReal = inicioSemana < fechaInicio ? fechaInicio : inicioSemana;
        const fechaFinReal = finSemana > fechaFin ? fechaFin : finSemana;
        
        this.semanasConFechas.push({
          nombre: `S${contadorSemana}`,
          fechaInicio: this.formatearFecha(fechaInicioReal),
          fechaFin: this.formatearFecha(fechaFinReal),
          fechaCompacta: this.formatearFechaCompacta(fechaInicioReal, fechaFinReal)
        });
        
        this.semanasColumnas.push(`S${contadorSemana}`);
        
        console.log(`📅 Semana ${contadorSemana}: ${this.formatearFecha(fechaInicioReal)} - ${this.formatearFecha(fechaFinReal)}`);
        
        contadorSemana++;
      }
      
      // Avanzar al próximo lunes
      inicioSemana.setDate(inicioSemana.getDate() + 7);
    }
    
    console.log('📅 Semanas calculadas para', this.mesActual.nombre, ':', this.semanasConFechas);
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

  onIrAFlowChart(): void {
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

    console.log('🔍 === DEBUG CARGA INICIAL ===');
    console.log('🔍 Plan ID buscado:', planId);
    console.log('🔍 Total pautas en localStorage:', respuestasPautas.length);
    console.log('🔍 Pautas encontradas para el plan:', pautasDelPlan.length);
    console.log('🔍 Pautas del plan:', pautasDelPlan);
    console.log('🔍 === FIN DEBUG ===');

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
      
      // Cargar spots guardados desde localStorage (nuevo formato por fecha)
      const spotsPorFecha = respuestaPauta.datos?.spotsPorFecha || {};
      const totalSpotsGuardados = Object.values(spotsPorFecha as { [key: string]: number }).reduce((total: number, spots: number) => total + (spots || 0), 0);
      
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
        // Cargar spots guardados por fecha
        medioExistente.spotsPorFecha = { ...medioExistente.spotsPorFecha, ...(spotsPorFecha as { [key: string]: number }) };
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
          spotsPorFecha: spotsPorFecha as { [key: string]: number } // Cargar spots guardados por fecha
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
      
      // Cargar spots guardados desde localStorage (nuevo formato por fecha)
      const spotsPorFecha = pautaResumen.datos?.spotsPorFecha || {};
      const totalSpotsGuardados = Object.values(spotsPorFecha as { [key: string]: number }).reduce((total: number, spots: number) => total + (spots || 0), 0);
      
      if (mediosMap.has(claveAgrupacion)) {
        // Si el medio y proveedor ya existen, sumar los valores
        const medioExistente = mediosMap.get(claveAgrupacion)!;
        medioExistente.salidas = Math.max(medioExistente.salidas, totalSpotsGuardados); // Usar spots guardados
        medioExistente.valorNeto = Number(medioExistente.valorNeto) + Number(valorTotal);
        medioExistente.soi = medioExistente.salidas > 0 ? Math.round(medioExistente.valorNeto / medioExistente.salidas) : 0;
        // Cargar spots guardados por fecha
        medioExistente.spotsPorFecha = { ...medioExistente.spotsPorFecha, ...(spotsPorFecha as { [key: string]: number }) };
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
          spotsPorFecha: spotsPorFecha as { [key: string]: number } // Cargar spots guardados por fecha
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
      console.log('🔄 Recargando resumen para plan ID:', this.planId);
      
      // Recargar las pautas del plan
      const periodosReales = this.cargarPeriodosConPautas(this.planId);
      
      // Verificar que se cargaron datos
      if (periodosReales && periodosReales.length > 0) {
        this.resumenPlan.periodos = periodosReales;
        this.periodos = periodosReales;
        this.periodoSeleccionado = periodosReales[0];
        this.calcularMesesDisponibles();
        this.calcularSemanasConFechas();
        this.prepararDataSource();
        this.actualizarTotalesPeriodo(); // Asegurar que los totales se recalculen
        console.log('✅ Resumen recargado con spots guardados:', this.periodoSeleccionado.medios);
        
        // Mostrar notificación de éxito
        this.snackBar.open('✅ Datos recargados correctamente', '', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar']
        });
      } else {
        console.log('❌ No se pudieron cargar períodos para el plan');
        
        // Mostrar notificación de error
        this.snackBar.open('❌ No se encontraron datos para cargar', '', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });
      }
    } else {
      console.log('❌ No hay planId para recargar');
      
      // Mostrar notificación de error
      this.snackBar.open('❌ No hay ID de plan para recargar', '', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
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
    
    // Actualizar totales del período
    this.actualizarTotalesPeriodo();
    
    // Guardar cambios en localStorage
    this.guardarCambiosEnLocalStorage();
    
    // Mostrar confirmación visual
    this.snackBar.open(`💾 Guardado: ${medio.nombre} - ${semanaActual.nombre}: ${nuevoSpots} spots (${fechaClave})`, '', { 
      duration: 1500,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
    
    console.log(`✅ Spots actualizados para ${medio.nombre} ${semanaActual.nombre} (${fechaClave}): ${nuevoSpots}`);
    console.log(`✅ Nueva inversión total: ${medio.valorNeto}`);
    console.log(`✅ Spots por fecha:`, medio.spotsPorFecha);
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
        // Guardar distribución de spots por fecha
        if (medio.spotsPorFecha) {
          respuestasPautas[pautaIndex].datos = respuestasPautas[pautaIndex].datos || {};
          respuestasPautas[pautaIndex].datos.spotsPorFecha = medio.spotsPorFecha;
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
          // Fallback a servicio local
          this.proveedoresDisponibles = this.plantillaService.obtenerProveedoresPorMedio(medio.nombre);
          this.filtrarProveedoresDisponibles(medio.nombre);
          this.cargandoProveedores = false;
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
        // Fallback a medios hardcodeados
        this.mediosDisponibles = [
          { medioId: 1, nombre: 'TV NAL', estado: true, fechaRegistro: '', descripcion: 'Televisión Nacional' },
          { medioId: 2, nombre: 'Radio', estado: true, fechaRegistro: '', descripcion: 'Radio' },
          { medioId: 3, nombre: 'Digital', estado: true, fechaRegistro: '', descripcion: 'Digital' },
          { medioId: 4, nombre: 'Prensa', estado: true, fechaRegistro: '', descripcion: 'Prensa' },
          { medioId: 5, nombre: 'OOH', estado: true, fechaRegistro: '', descripcion: 'Out of Home' }
        ];
        this.cargandoMedios = false;
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
    if (this.medioForm.valid && !this.existeCombinacion) {
      const valores = this.medioForm.value;
      const medioSeleccionado = valores.medio as MedioBackend;
      const proveedorSeleccionado = this.proveedoresDisponibles.find(p => p.id === valores.proveedor);
      
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
      
      // Crear una pauta simple para almacenar el medio
      const nuevaPauta: RespuestaPauta = {
        id: `pauta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        planId: this.data.planData.id,
        plantillaId: 'simple',
        paisFacturacion: 'Perú',
        medio: medioSeleccionado.nombre,
        proveedor: proveedorSeleccionado ? proveedorSeleccionado.VENDOR : 'Sin proveedor',
        proveedorId: valores.proveedor,
        datos: { 
          tarifa: Number(valores.tarifa),
          spotsPorFecha: {} // Inicializar spots por fecha vacío
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