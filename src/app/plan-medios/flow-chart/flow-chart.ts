import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { PlantillaPautaService } from '../services/plantilla-pauta.service';
import { TemplateDinamicoService } from '../services/template-dinamico.service';
import { PlantillaPauta, CampoPlantilla, RespuestaPauta, DiaCalendario } from '../models/plantilla-pauta.model';
import { Inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CrearPlanMedioItemRequest, MedioBackend, PlanMedioItemBackend, ProveedorBackend, PlanMedioItemFlowchartBackend, CrearPlanMedioItemFlowchartRequest, ActualizarPlanMedioItemFlowchartRequest } from '../models/backend-models';
import { BackendMediosService } from '../services/backend-medios.service';

interface GrupoMedio {
  medio: string;
  pautas: RespuestaPauta[];
  totalPautas: number;
  valorTotal: number;
  totalSpots: number;
  expandido: boolean;
}

interface PlanData {
  id?: string;
  numeroPlan: string;
  version: number;
  cliente: string;
  producto: string;
  campana: string;
  fechaInicio?: string;
  fechaFin?: string;
  medioSeleccionado?: string;
}

@Component({
  selector: 'app-flow-chart',
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
    MatTableModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule
  ],
  templateUrl: './flow-chart.html',
  styleUrls: ['./flow-chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, height: 0 }),
        animate('300ms ease-in', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, height: 0 }))
      ])
    ])
  ]
})
export class FlowChart implements OnInit {
  // Formulario principal para seleccionar medio
  seleccionForm!: FormGroup;
  
  // Formulario dinámico para la pauta
  pautaForm!: FormGroup;
  
  // Datos del plan
  planData: PlanData | null = null;
  
  // Plantilla actual cargada
  plantillaActual: PlantillaPauta | null = null;
  
  // Estados de carga
  cargandoPlantilla: boolean = false;
  errorPlantilla: string | null = null;
  
  // Items de la pauta (nueva estructura)
  itemsPauta: RespuestaPauta[] = [];
  
  // Items agrupados por medio
  itemsAgrupadosPorMedio: GrupoMedio[] = [];
  
  // Fechas del plan para las columnas
  fechasDelPlan: Date[] = [];
  
  // Programación de items por fecha (ahora con cantidad de spots)
  programacionItems: { [itemId: string]: { [fecha: string]: number } } = {};
  
  // Control de expandir/contraer items
  itemsExpandidos: { [key: string]: boolean } = {};
  
  // Pautas guardadas (mantenemos para compatibilidad)
  pautasGuardadas: RespuestaPauta[] = [];
  
  // Medios disponibles
  mediosDisponibles: string[] = ['TV NAL', 'Radio', 'Digital', 'Prensa', 'OOH'];
  
  // Medios activos (que tienen pautas)
  mediosActivos: string[] = [];
  
  // Items agrupados por medio para pestañas
  itemsPorMedio: { [medio: string]: RespuestaPauta[] } = {};
  
  // Semanas disponibles para la pauta
  semanasDisponibles = [
    { codigo: 'L1', nombre: 'Semana 1' },
    { codigo: 'L7', nombre: 'Semana 7' },
    { codigo: 'L14', nombre: 'Semana 14' },
    { codigo: 'L21', nombre: 'Semana 21' },
    { codigo: 'L28', nombre: 'Semana 28' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private plantillaService: PlantillaPautaService,
    private templateDinamicoService: TemplateDinamicoService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private backendMediosService: BackendMediosService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const rawPlanData = navigation?.extras?.state?.['planData'] as any;
    const fromPlanMedios = navigation?.extras?.state?.['fromPlanMedios'];
    const mediosYProveedores = navigation?.extras?.state?.['mediosYProveedores'];

    if (!rawPlanData) {
      this.router.navigate(['/plan-medios-resumen']);
      return;
    }

    // Asegurar que planData tenga el formato correcto
    this.planData = {
      id: String(rawPlanData.id || ''), // ASEGURAR QUE ID SEA STRING
      numeroPlan: String(rawPlanData.numeroPlan || ''), // Asegurar string
      version: Number(rawPlanData.version || 1), // Asegurar number
      cliente: String(rawPlanData.cliente || ''),
      producto: String(rawPlanData.producto || ''),
      campana: String(rawPlanData.campana || ''),
      fechaInicio: String(rawPlanData.fechaInicio || ''),
      fechaFin: String(rawPlanData.fechaFin || ''),
      medioSeleccionado: rawPlanData.medioSeleccionado
    };

    // Asegurar que el plan tenga un ID único
    if (!this.planData.id) {
      // Generar ID basado en numeroPlan y version si no existe
      this.planData.id = `${this.planData.numeroPlan}-v${this.planData.version}`;
      console.log('🆔 ID generado para el plan:', this.planData.id);
    }
    
    // Inicializar fechas del plan
    this.inicializarFechasDelPlan();
    console.log('✅ FECHAS INICIALIZADAS - Cantidad de fechas generadas:', this.fechasDelPlan.length);
    
    console.log('🆔 === CONSTRUCTOR FLOWCHART ===');
    console.log('🆔 Plan Data recibido:', this.planData);
    console.log('🆔 planData.id:', this.planData?.id, 'tipo:', typeof this.planData?.id);
    console.log('🆔 planData.numeroPlan:', this.planData?.numeroPlan, 'tipo:', typeof this.planData?.numeroPlan);
    console.log('🆔 planData.version:', this.planData?.version, 'tipo:', typeof this.planData?.version);
    console.log('📊 Viene desde Plan de Medios:', fromPlanMedios);
    console.log('📊 Medios y Proveedores:', mediosYProveedores);

    this.seleccionForm = this.fb.group({
      medio: ['', Validators.required]
    });

    this.seleccionForm.get('medio')?.valueChanges.subscribe(medio => {
      if (medio && medio.trim()) {
        this.cargarPlantillaPorMedio(medio);
      } else {
        this.plantillaActual = null;
        this.errorPlantilla = null;
        this.cargandoPlantilla = false;
        this.pautaForm = this.fb.group({});
      }
    });
    
    // Verificar si necesita inicializar plantillas
    this.verificarPlantillas();
    
    // Si viene desde Plan de Medios, procesar automáticamente los medios
    if (fromPlanMedios && mediosYProveedores && mediosYProveedores.length > 0) {
      console.log('🔄 Procesando medios desde Plan de Medios...');
      this.procesarMediosDelPlan(mediosYProveedores);
    }
  }

  ngOnInit(): void {
    this.cargandoPlantilla = false;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    // Migrar pautas existentes al nuevo sistema de IDs si es necesario
    this.migrarPautasExistentes();
    
    this.cargarPautasExistentes();
    
    // Si viene un medio seleccionado desde el resumen, pre-seleccionarlo
    if (this.planData?.medioSeleccionado) {
      console.log('🎯 Pre-seleccionando medio:', this.planData.medioSeleccionado);
      this.seleccionForm.patchValue({
        medio: this.planData.medioSeleccionado
      });
      // Mostrar mensaje informativo
      this.snackBar.open(`Editando medio: ${this.planData.medioSeleccionado}`, 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['info-snackbar']
      });
    }
  }

  // Procesar medios desde Plan de Medios y crear pautas automáticamente
  private procesarMediosDelPlan(mediosYProveedores: any[]): void {
    console.log('🔄 Iniciando procesamiento de medios del plan:', mediosYProveedores);
    
    if (!this.planData?.id) {
      console.error('❌ No hay ID del plan para procesar medios');
      return;
    }

    // Verificar si ya existen pautas para este plan (usando itemsPauta en memoria)
    const pautasDelPlan = this.itemsPauta.filter(pauta => pauta.planId === this.planData?.id);
    
    if (pautasDelPlan.length > 0) {
      console.log('✅ Ya existen pautas para este plan, actualizando con datos del resumen');
      this.actualizarPautasExistentes(mediosYProveedores);
      return;
    }

    let pautasCreadas = 0;
    
    mediosYProveedores.forEach((medioProveedor: any) => {
      try {
        const medio = medioProveedor.medio;
        const proveedor = medioProveedor.proveedor;
        const tarifa = medioProveedor.tarifa || 0;
        const totalSpots = medioProveedor.totalSpots || 1;
        const valorNeto = medioProveedor.valorNeto || tarifa;
        const spotsPorSemana = medioProveedor.spotsPorSemana || [0, 0, 0, 0, 0];
        const semanas = medioProveedor.semanas || [false, false, false, false, false];
        
        console.log(`🔄 Procesando: ${medio} - ${proveedor}`);
        
        // Obtener plantilla para este medio
        const plantilla = this.plantillaService.obtenerPlantillaPorMedio(medio);
        
        if (!plantilla) {
          console.warn(`⚠️ No se encontró plantilla para el medio: ${medio}`);
          return;
        }
        
        // Crear pauta automática basada en la plantilla
        const pautaAutomatica: RespuestaPauta = {
          id: `pauta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          planId: this.planData!.id!,
          medio: medio,
          proveedor: proveedor,
          proveedorId: medioProveedor.proveedorId,
          plantillaId: plantilla.id,
          paisFacturacion: this.planData!.cliente || 'Default', // Usar cliente como país
          fechaCreacion: new Date().toISOString(),
          datos: {
            ...this.generarDatosPlantilla(plantilla, { tarifa, proveedor }),
            spotsPorSemana: spotsPorSemana,
            tarifa: tarifa,
            valorTotal: valorNeto,
            totalSpots: totalSpots
          },
          totalSpots: totalSpots,
          valorTotal: valorNeto,
          valorNeto: valorNeto,
          semanas: semanas, // Mantener el array de booleans original
          diasSeleccionados: []
        };
        
        // Si hay spots por semana, crear programación básica
        if (spotsPorSemana.some((spots: number) => spots > 0)) {
          this.crearProgramacionDesdeSpotsSemanales(pautaAutomatica.id, spotsPorSemana);
        }
        
        // Agregar directamente a itemsPauta en memoria
        this.itemsPauta.push(pautaAutomatica);
        
        pautasCreadas++;
        console.log(`✅ Pauta creada para ${medio} - ${proveedor}`);
        
      } catch (error) {
        console.error(`❌ Error procesando ${medioProveedor.medio}:`, error);
      }
    });
    
    if (pautasCreadas > 0) {
      this.snackBar.open(`${pautasCreadas} medios agregados al FlowChart`, 'Ver', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
      
      // Recargar las pautas para mostrar los nuevos items
      setTimeout(() => {
        this.cargarItemsPauta();
      }, 100);
    }
  }

  /**
   * Actualiza las pautas existentes con los datos del resumen
   */
  private actualizarPautasExistentes(mediosYProveedores: any[]): void {
    console.log('🔄 Actualizando pautas existentes con datos del resumen');
    
    let pautasActualizadas = 0;
    
    mediosYProveedores.forEach((medioProveedor: any) => {
      const pautaExistente = this.itemsPauta.find((pauta: any) => 
        pauta.planId === this.planData?.id && 
        pauta.medio === medioProveedor.medio && 
        pauta.proveedor === medioProveedor.proveedor
      );
      
      if (pautaExistente) {
        // Actualizar con datos del resumen
        pautaExistente.valorTotal = medioProveedor.valorNeto || medioProveedor.tarifa || 0;
        pautaExistente.valorNeto = medioProveedor.valorNeto || medioProveedor.tarifa || 0;
        pautaExistente.totalSpots = medioProveedor.totalSpots || 1;
        pautaExistente.fechaModificacion = new Date().toISOString();
        
        if (pautaExistente.datos) {
          pautaExistente.datos['tarifa'] = medioProveedor.tarifa || 0;
          pautaExistente.datos['spotsPorSemana'] = medioProveedor.spotsPorSemana || [0, 0, 0, 0, 0];
          pautaExistente.datos['valorTotal'] = medioProveedor.valorNeto || medioProveedor.tarifa || 0;
          pautaExistente.datos['totalSpots'] = medioProveedor.totalSpots || 1;
        }
        
         // Actualizar semanas
         if (medioProveedor.semanas) {
           pautaExistente.semanas = medioProveedor.semanas; // Mantener el array de booleans original
         }
        
        // Actualizar programación si hay spots por semana
        if (medioProveedor.spotsPorSemana && medioProveedor.spotsPorSemana.some((spots: number) => spots > 0)) {
          this.crearProgramacionDesdeSpotsSemanales(pautaExistente.id, medioProveedor.spotsPorSemana);
        }
        
        pautasActualizadas++;
        console.log('✅ Pauta actualizada:', pautaExistente);
      }
    });
    
    if (pautasActualizadas > 0) {
      console.log(`✅ ${pautasActualizadas} pautas actualizadas desde Plan de Medios`);
      this.snackBar.open(`${pautasActualizadas} medios actualizados con datos del resumen`, 'Ver', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
      
      // Recargar las pautas para mostrar los cambios
      setTimeout(() => {
        this.cargarItemsPauta();
      }, 100);
    }
  }



  /**
   * Crea programación básica desde los spots semanales
   */
  private crearProgramacionDesdeSpotsSemanales(pautaId: string, spotsPorSemana: number[]): void {
    if (!this.planData?.fechaInicio) return;
    
    const fechaInicio = new Date(this.planData.fechaInicio);
    const programacion: { [fecha: string]: number } = {};
    
    spotsPorSemana.forEach((spots, semanaIndex) => {
      if (spots > 0) {
        // Distribuir los spots a lo largo de la semana
        const spotsPorDia = Math.floor(spots / 7);
        const spotsExtra = spots % 7;
        
        for (let dia = 0; dia < 7; dia++) {
          const fecha = new Date(fechaInicio);
          fecha.setDate(fechaInicio.getDate() + (semanaIndex * 7) + dia);
          
          let spotsParaEsteDia = spotsPorDia;
          if (dia < spotsExtra) {
            spotsParaEsteDia++;
          }
          
          if (spotsParaEsteDia > 0) {
            const fechaStr = fecha.toISOString().split('T')[0];
            programacion[fechaStr] = spotsParaEsteDia;
          }
        }
      }
    });
    
    // Guardar programación
    if (Object.keys(programacion).length > 0) {
      this.programacionItems[pautaId] = programacion;
    }
  }

  // Generar datos por defecto para una plantilla
  private generarDatosPlantilla(plantilla: PlantillaPauta, valoresExtra: any = {}): any {
    const datos: any = {};
    
    plantilla.fields.forEach(campo => {
      if (campo.name === 'tarifa' || campo.name === 'tarifa_bruta' || campo.name === 'tarifa_bruta_30') {
        datos[campo.name] = valoresExtra.tarifa || campo.defaultValue || 0;
      } else if (campo.name === 'proveedor' || campo.name === 'vendor') {
        datos[campo.name] = valoresExtra.proveedor || campo.defaultValue || '';
      } else if (campo.name === 'total_spots') {
        datos[campo.name] = 1; // Valor por defecto para spots
      } else {
        datos[campo.name] = campo.defaultValue || '';
      }
    });
    
    // Campos comunes que siempre deberían estar
    datos.total_spots = datos.total_spots || 1;
    datos.valor_total = valoresExtra.tarifa || 0;
    datos.valor_neto = valoresExtra.tarifa || 0;
    
    return datos;
  }

  private migrarPautasExistentes(): void {
    // Migración eliminada - no se usa localStorage
    console.log('🔄 Migración omitida - sin localStorage');
  }

  // Cargar plantilla dinámica desde el backend
  cargarPlantillaPorMedio(medio: string): void {
    this.cargandoPlantilla = true;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    console.log('🔄 Cargando plantilla dinámica para medio:', medio);
    
    // Usar el servicio dinámico
    this.templateDinamicoService.obtenerPlantillaPorMedio(medio).subscribe({
      next: (plantilla) => {
        if (plantilla) {
          this.plantillaActual = plantilla;
          this.generarFormularioSimplificado();
          this.configurarCalculosAutomaticos();
          
          this.snackBar.open(`Plantilla dinámica cargada: ${plantilla.nombre}`, '', { 
            duration: 2000,
            panelClass: ['success-snackbar']
          });
          this.errorPlantilla = null;
          console.log('✅ Plantilla dinámica cargada:', plantilla);
        } else {
          this.errorPlantilla = `No se encontró plantilla en el backend para "${medio}". ` +
                               `Verifica que el medio tenga una plantilla configurada en el servidor.`;
          this.pautaForm = this.fb.group({});
          console.warn('⚠️ No se encontró plantilla para medio:', medio);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando plantilla dinámica:', error);
        this.errorPlantilla = `Error conectando con el backend para cargar la plantilla de "${medio}". ` +
                             `Intenta nuevamente o contacta al administrador.`;
        this.plantillaActual = null;
        this.pautaForm = this.fb.group({});
      },
      complete: () => {
        this.cargandoPlantilla = false;
        this.cdr.detectChanges();
      }
    });
  }

  generarFormularioSimplificado(): void {
    if (!this.plantillaActual) {
      this.pautaForm = this.fb.group({});
      return;
    }

    const formConfig: { [key: string]: any } = {
      semanas: [[]]
    };

    for (const campo of this.plantillaActual.fields) {
      formConfig[campo.name] = [campo.defaultValue || ''];
    }

    this.pautaForm = this.fb.group(formConfig);
  }

  configurarCalculosAutomaticos(): void {
    if (!this.pautaForm) return;

    this.pautaForm.valueChanges.subscribe(valores => {
      this.calcularMontos(valores);
    });
  }

  calcularMontos(valores: any): void {
    const tarifaBruta = parseFloat(valores.tarifa_bruta_30 || valores.tarifa_bruta || 0);
    const dtoCliente = parseFloat(valores.dto_cliente || 0);
    const dtoAgencia = parseFloat(valores.dto_agencia || 0);
    const totalSpots = parseInt(valores.total_spots || 1);
    const duracionReal = parseInt(valores.duracion_real || 30);
    
    if (tarifaBruta > 0) {
      const factorDuracion = duracionReal / 30;
      const valorSpot = tarifaBruta * factorDuracion;
      const descuentoTotal = (dtoCliente + dtoAgencia) / 100;
      const valorNeto = valorSpot * (1 - descuentoTotal);
      const valorTotal = valorNeto * totalSpots;
      const iva = valorTotal * 0.18;

      this.pautaForm.patchValue({
        valor_spot: Math.round(valorSpot),
        valor_neto: Math.round(valorNeto),
        valor_total: Math.round(valorTotal),
        iva: Math.round(iva)
      }, { emitEvent: false });

      this.cdr.detectChanges();
    }
  }

  private lookupCache = new Map<string, any[]>();

  obtenerOpcionesLookup(campo: CampoPlantilla): any[] {
    if (!campo.lookupTable) {
      return [];
    }
    
    const cacheKey = `${campo.lookupTable}_${campo.lookupCategory || ''}`;
    
    if (!this.lookupCache.has(cacheKey)) {
      const opciones = this.plantillaService.obtenerDatosLookup(campo.lookupTable, campo.lookupCategory);
      this.lookupCache.set(cacheKey, opciones);
    }
    
    return this.lookupCache.get(cacheKey) || [];
  }

  onSubmit(): void {
    if (!this.plantillaActual || !this.planData) {
      this.snackBar.open('Error: No hay plantilla o datos del plan', '', { duration: 3000 });
      return;
    }

    // ⚠️ Este método está deprecated - usar el modal para crear/editar items
    this.snackBar.open('Use el botón "Agregar Item" para crear nuevas pautas', 'OK', { duration: 3000 });
  }

  eliminarPauta(pautaId: string, index: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta pauta?')) {
      const planMedioItemId = Number(pautaId);
      
      if (isNaN(planMedioItemId)) {
        this.snackBar.open('Error: ID de item inválido', '', { duration: 3000, panelClass: ['error-snackbar'] });
        return;
      }

      this.backendMediosService.eliminarPlanMedioItemFlowchart(planMedioItemId).subscribe({
        next: (response) => {
          console.log('✅ Item eliminado del backend:', response);
          
          // Eliminar de memoria local después del éxito en backend
          this.pautasGuardadas = this.pautasGuardadas.filter(item => item.id !== pautaId);
          this.itemsPauta = this.itemsPauta.filter(item => item.id !== pautaId);
          
          // Limpiar programación del item eliminado
          delete this.programacionItems[pautaId];
          
          this.snackBar.open('✅ Item eliminado exitosamente', '', { 
            duration: 2000,
            panelClass: ['success-snackbar']
          });
          
          // Recargar datos para asegurar consistencia
          this.recargarDatosFlowChart();
          
        },
        error: (error) => {
          console.error('❌ Error eliminando item del backend:', error);
          this.snackBar.open('❌ Error al eliminar el item', '', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Método eliminado - no se usa localStorage

  private cargarPautasExistentes(): void {
    console.log('=== CARGANDO PAUTAS DESDE BACKEND ===');
    console.log('Plan Data:', this.planData);
    console.log('Plan Data ID:', this.planData?.id);
    
    if (!this.planData?.id || !this.planData?.version) {
      console.log('❌ No hay ID o version del plan, no se pueden cargar pautas');
      this.pautasGuardadas = [];
      this.itemsPauta = [];
      return;
    }
    
    // Cargar desde el backend
    const planId = Number(this.planData.id);
    const version = Number(this.planData.version);
    
    console.log('🔄 Cargando items FlowChart desde backend:', { planId, version });
    
    this.backendMediosService.getPlanMedioItemsFlowchartPorPlan(planId, version).subscribe({
      next: (itemsFlowchart: PlanMedioItemFlowchartBackend[]) => {
        console.log('✅ Items FlowChart recibidos del backend:', itemsFlowchart);
        
        if (itemsFlowchart.length > 0) {
          // Convertir items del backend al formato local
          this.itemsPauta = itemsFlowchart.map(item => this.convertirItemBackendALocal(item));
          this.pautasGuardadas = [...this.itemsPauta];
          
          console.log('📊 Items convertidos para FlowChart:', this.itemsPauta.length);
          
          this.snackBar.open(`✅ ${this.itemsPauta.length} items cargados desde el backend`, '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          console.log('ℹ️ No hay items en el backend para este plan');
          this.itemsPauta = [];
          this.pautasGuardadas = [];
          
          this.snackBar.open('ℹ️ Este plan no tiene items en FlowChart aún', '', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }
        
        // Cargar items como lista simple
        this.cargarItemsPauta();
        
        // Diagnóstico de datos cargados
        setTimeout(() => {
          this.diagnosticarEstadoDatos();
        }, 100);
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        setTimeout(() => {
          this.cdr.detectChanges();
          console.log('🔄 Items cargados en vista:', this.itemsPauta.length);
        }, 0);
      },
      error: (error: any) => {
        console.error('❌ Error cargando items FlowChart desde backend:', error);
        // Fallback a datos vacíos
        this.pautasGuardadas = [];
        this.itemsPauta = [];
        this.cdr.detectChanges();
        
        this.snackBar.open('⚠️ No se pudieron cargar los items del FlowChart', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }

  // Método para refrescar la lista de forma forzada
  private refrescarListaItems(): void {
    console.log('🔄 === REFRESCANDO LISTA DE ITEMS ===');
    
    // Cargar pautas desde storage
    this.cargarPautasExistentes();
    
    // Forzar múltiples detecciones de cambios
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('✅ Lista refrescada - Items visibles:', this.itemsPauta.length);
      console.log('✅ Medios activos:', this.mediosActivos);
    }, 50);
    
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('✅ Segunda actualización - Items visibles:', this.itemsPauta.length);
    }, 150);
  }

  onCargaExcel(): void {
    this.snackBar.open('Funcionalidad de carga Excel próximamente', '', { duration: 2000 });
  }

  onDescargaExcel(): void {
    this.snackBar.open('Funcionalidad de descarga Excel próximamente', '', { duration: 2000 });
  }

  /**
   * Sincroniza los datos del FlowChart con el resumen
   * Convierte la programación diaria en spots por semana
   */
  private sincronizarConResumen(): void {
    if (!this.planData?.id) return;

    console.log('🔄 Sincronizando datos de FlowChart con Resumen...');
    
    // Agrupar pautas por medio y proveedor
    const pautasParaResumen = this.itemsPauta.map(item => {
      const spotsPorSemana = this.calcularSpotsPorSemana(item.id);
      const valorTotal = item.valorTotal || 0;
      
      return {
        id: item.id,
        medio: item.medio,
        proveedor: item.proveedor || 'Sin proveedor',
        // El valor tarifa será el valor total que se guardó en FlowChart
        tarifa: valorTotal,
        spotsPorSemana: spotsPorSemana,
        totalSpots: spotsPorSemana.reduce((sum, spots) => sum + spots, 0),
        inversion: valorTotal,
        semanas: this.convertirSpotsASemanas(spotsPorSemana),
        fechaCreacion: item.fechaCreacion,
        fechaModificacion: new Date().toISOString()
      };
    });

    // Solo crear estructura de sincronización en memoria
    console.log('✅ Datos sincronizados:', pautasParaResumen);
    console.log('💾 Datos mantenidos en memoria para sincronización');
  }

  /**
   * Calcula los spots por semana basándose en la programación del FlowChart
   */
  private calcularSpotsPorSemana(itemId: string): number[] {
    const spotsPorSemana = [0, 0, 0, 0, 0]; // 5 semanas
    
    if (!this.programacionItems[itemId]) {
      return spotsPorSemana;
    }

    const fechaInicio = new Date(this.planData?.fechaInicio || '');
    const programacion = this.programacionItems[itemId];
    
    Object.keys(programacion).forEach(fechaStr => {
      const fecha = new Date(fechaStr);
      const spots = programacion[fechaStr];
      
      if (spots > 0) {
        // Calcular a qué semana pertenece esta fecha
        const diffTime = fecha.getTime() - fechaInicio.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const semanaIndex = Math.floor(diffDays / 7);
        
        if (semanaIndex >= 0 && semanaIndex < 5) {
          spotsPorSemana[semanaIndex] += spots;
        }
      }
    });
    
    return spotsPorSemana;
  }

  /**
   * Convierte los spots por semana a array de boolean para el resumen
   */
  private convertirSpotsASemanas(spotsPorSemana: number[]): boolean[] {
    return spotsPorSemana.map(spots => spots > 0);
  }

  onRegresar(): void {
    console.log('📋 === REGRESANDO A PLAN MEDIOS RESUMEN ===');
    console.log('📋 Datos originales en FlowChart:');
    console.log('📋 this.planData.id:', this.planData?.id, 'tipo:', typeof this.planData?.id);
    console.log('📋 this.planData.numeroPlan:', this.planData?.numeroPlan, 'tipo:', typeof this.planData?.numeroPlan);
    console.log('📋 this.planData.version:', this.planData?.version, 'tipo:', typeof this.planData?.version);
    
    // Preparar solo los datos básicos del plan para recargar
    const planDataBasico = {
      id: this.planData?.id,
      numeroPlan: String(this.planData?.numeroPlan || ''), // Asegurar que sea string
      version: this.planData?.version,
      cliente: this.planData?.cliente || '',
      producto: this.planData?.producto || '',
      campana: this.planData?.campana || '',
      fechaInicio: this.planData?.fechaInicio || '',
      fechaFin: this.planData?.fechaFin || ''
    };
    
    console.log('📋 Plan Data básico para recarga:', planDataBasico);
    console.log('📋 planDataBasico.id:', planDataBasico.id, 'tipo:', typeof planDataBasico.id);
    console.log('📋 planDataBasico.numeroPlan:', planDataBasico.numeroPlan, 'tipo:', typeof planDataBasico.numeroPlan);
    
    // Regresar al resumen para que recargue desde el backend
    this.router.navigate(['/plan-medios-resumen'], {
      state: { 
        planData: planDataBasico,
        fromFlowChart: true,
        shouldReload: true
      }
    });
  }

  trackByCampo(index: number, campo: any): string {
    return campo.name || index.toString();
  }

  trackByPauta(index: number, pauta: RespuestaPauta): string {
    return pauta.id || index.toString();
  }

  esInputField(campo: any): boolean {
    return !campo.options && !campo.lookupTable;
  }

  esSelectField(campo: any): boolean {
    return campo.options && !campo.lookupTable;
  }

  esLookupField(campo: any): boolean {
    return !!campo.lookupTable;
  }

  obtenerTipoCampo(campo: CampoPlantilla): string {
    switch (campo.type) {
      case 'integer':
      case 'decimal':
      case 'money':
        return 'number';
      case 'time':
        return 'time';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  toggleSemana(codigoSemana: string, checked: boolean): void {
    const semanasControl = this.pautaForm.get('semanas');
    if (!semanasControl) return;

    let semanasActuales = semanasControl.value || [];
    
    if (checked) {
      if (!semanasActuales.includes(codigoSemana)) {
        semanasActuales.push(codigoSemana);
      }
    } else {
      semanasActuales = semanasActuales.filter((s: string) => s !== codigoSemana);
    }
    
    semanasControl.setValue(semanasActuales);
  }

  getMainFields(datos: any): string[] {
    if (!datos) return [];
    
    const todasLasClaves = Object.keys(datos).filter(key => 
      key !== 'semanas' && datos[key] !== null && datos[key] !== undefined && datos[key] !== ''
    );
    
    const camposPrioritarios = ['IdProveedor', 'IdVehiculo', 'hora', 'franja', 'valor_neto', 'total_spots', 'tarifa_bruta', 'programa'];
    
    const camposEncontrados = camposPrioritarios.filter(campo => 
      todasLasClaves.some(key => key.toLowerCase().includes(campo.toLowerCase()))
    );
    
    const camposRestantes = todasLasClaves.filter(key => 
      !camposPrioritarios.some(campo => key.toLowerCase().includes(campo.toLowerCase()))
    );
    
    return [...camposEncontrados, ...camposRestantes].slice(0, 6);
  }

  getFieldLabel(fieldName: string): string {
    if (!this.plantillaActual) {
      return this.formatearNombreCampo(fieldName);
    }
    
    const campo = this.plantillaActual.fields.find(f => f.name === fieldName);
    return campo ? campo.label : this.formatearNombreCampo(fieldName);
  }

  private formatearNombreCampo(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  formatFieldValue(value: any, fieldName: string): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const campo = this.plantillaActual?.fields.find(f => f.name === fieldName);
    
    if (campo) {
      switch (campo.type) {
        case 'money':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) return '-';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue);
        
        case 'decimal':
          const decValue = parseFloat(value);
          if (isNaN(decValue)) return '-';
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(decValue);
        
        case 'integer':
          const intValue = parseInt(value);
          if (isNaN(intValue)) return '-';
          return new Intl.NumberFormat('en-US').format(intValue);
        
        default:
          if (campo.lookupTable) {
            const opciones = this.obtenerOpcionesLookup(campo);
            const opcion = opciones.find(o => o.codigo == value);
            return opcion ? opcion.valor : value.toString();
          }
          return value.toString();
      }
    } else {
      if (fieldName.toLowerCase().includes('idproveedor') || fieldName.toLowerCase().includes('idvehiculo') || fieldName.toLowerCase().includes('idprograma')) {
        const opciones = this.buscarEnTodosLosLookups(value);
        return opciones || value.toString();
      }
      
      if (fieldName.toLowerCase().includes('valor') || fieldName.toLowerCase().includes('tarifa') || fieldName.toLowerCase().includes('precio')) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue);
        }
      }
      
      if (fieldName.toLowerCase().includes('spots') || fieldName.toLowerCase().includes('total')) {
        const intValue = parseInt(value);
        if (!isNaN(intValue)) {
          return new Intl.NumberFormat('en-US').format(intValue);
        }
      }
      
      return value.toString();
    }
  }

  private buscarEnTodosLosLookups(codigo: any): string | null {
    try {
      const lookupData = this.plantillaService.obtenerTodosLosLookups();
      for (const tabla of lookupData) {
        const item = tabla.datos.find(d => d.codigo == codigo);
        if (item) {
          return item.valor;
        }
      }
    } catch (error) {
      console.error('Error buscando en lookups:', error);
    }
    return null;
  }

  abrirModalNuevaPauta(): void {
    const dialogRef = this.dialog.open(ModalNuevaPautaComponent, {
      width: '90%',
      maxWidth: '1200px',
      height: '90%',
      data: {
        planData: this.planData,
        action: 'create',
        mediosDisponibles: this.mediosDisponibles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.shouldRefresh) {
        console.log('✅ Nueva pauta guardada, recargando lista');
        this.refrescarListaItems();
        
        this.snackBar.open('Pauta agregada exitosamente', '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  abrirCalendarioPauta(pauta: RespuestaPauta): void {
    const dialogRef = this.dialog.open(ModalCalendarioPautaComponent, {
      width: '80%',
      maxWidth: '800px',
      height: '70%',
      data: {
        pauta: pauta,
        planData: this.planData
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarPautasExistentes();
        this.snackBar.open('Calendario actualizado', '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  // Métodos para la nueva estructura de calendario
  private inicializarFechasDelPlan(): void {
    console.log('🚀 INICIANDO INICIALIZACIÓN DE FECHAS DEL PLAN');
    console.log('🔍 Plan Data recibido:', this.planData);
    console.log('🔍 Fecha Inicio:', this.planData?.fechaInicio);
    console.log('🔍 Fecha Fin:', this.planData?.fechaFin);
    
    if (!this.planData?.fechaInicio || !this.planData?.fechaFin) {
      console.log('⚠️ No hay fechas definidas, usando rango por defecto');
      // Si no hay fechas, usar un rango por defecto
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      
      console.log('📅 Fechas por defecto - Inicio:', inicio, 'Fin:', fin);
      
      // Asignar las fechas al planData para que aparezcan en la vista
      if (this.planData) {
        this.planData.fechaInicio = inicio.toISOString().split('T')[0];
        this.planData.fechaFin = fin.toISOString().split('T')[0];
      }
      
      this.generarFechas(inicio, fin);
    } else {
      console.log('✅ Usando fechas del plan');
      
      // Parsear fechas correctamente sin desfase de zona horaria
      const partesInicio = this.planData.fechaInicio.split('-');
      const partesFin = this.planData.fechaFin.split('-');
      
      const inicio = new Date(
        parseInt(partesInicio[0]), 
        parseInt(partesInicio[1]) - 1, 
        parseInt(partesInicio[2])
      );
      
      const fin = new Date(
        parseInt(partesFin[0]), 
        parseInt(partesFin[1]) - 1, 
        parseInt(partesFin[2])
      );
      
      console.log('📅 Fechas del plan - Inicio:', inicio, 'Fin:', fin);
      console.log('📅 Fechas parseadas - Inicio válida:', !isNaN(inicio.getTime()), 'Fin válida:', !isNaN(fin.getTime()));
      
      this.generarFechas(inicio, fin);
    }
  }

  private generarFechas(inicio: Date, fin: Date): void {
    this.fechasDelPlan = [];
    const fechaActual = new Date(inicio);
    
    console.log('🔄 Generando fechas desde:', inicio.toISOString().split('T')[0], 'hasta:', fin.toISOString().split('T')[0]);
    
    while (fechaActual <= fin) {
      this.fechasDelPlan.push(new Date(fechaActual));
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    console.log('📅 Fechas del plan generadas:', this.fechasDelPlan.length, 'días');
    console.log('📅 Primera fecha:', this.fechasDelPlan[0]?.toISOString().split('T')[0]);
    console.log('📅 Última fecha:', this.fechasDelPlan[this.fechasDelPlan.length - 1]?.toISOString().split('T')[0]);
    console.log('📅 Primeras 5 fechas:', this.fechasDelPlan.slice(0, 5).map(f => f.toISOString().split('T')[0]));
  }

  private cargarItemsPauta(): void {
    // Cargar los items como lista simple (sin agrupar)
    this.itemsPauta = [...this.pautasGuardadas];
    console.log('📋 Items de pauta cargados:', this.itemsPauta.length);
    console.log('📋 Items cargados:', this.itemsPauta.map(item => ({ id: item.id, medio: item.medio })));
    
    // Agrupar items por medio
    this.agruparItemsPorMedio();
    
    // Agrupar para pestañas
    this.agruparItemsParaPestañas();
    
    // Programación se mantiene solo en memoria (this.programacionItems ya inicializada)
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  private agruparItemsPorMedio(): void {
    const grupos: { [medio: string]: GrupoMedio } = {};
    
    // Agrupar pautas por medio
    this.itemsPauta.forEach(pauta => {
      if (!grupos[pauta.medio]) {
        grupos[pauta.medio] = {
          medio: pauta.medio,
          pautas: [],
          totalPautas: 0,
          valorTotal: 0,
          totalSpots: 0,
          expandido: true // Por defecto expandido
        };
      }
      
      grupos[pauta.medio].pautas.push(pauta);
      grupos[pauta.medio].totalPautas++;
      grupos[pauta.medio].valorTotal += pauta.valorTotal || 0;
      grupos[pauta.medio].totalSpots += pauta.totalSpots || 0;
    });
    
    // Convertir a array ordenado
    this.itemsAgrupadosPorMedio = Object.values(grupos).sort((a, b) => a.medio.localeCompare(b.medio));
    
    console.log('📊 Items agrupados por medio:', this.itemsAgrupadosPorMedio);
  }

  private agruparItemsParaPestañas(): void {
    // Resetear agrupación
    this.itemsPorMedio = {};
    this.mediosActivos = [];
    
    // Agrupar pautas por medio
    this.itemsPauta.forEach(pauta => {
      if (!this.itemsPorMedio[pauta.medio]) {
        this.itemsPorMedio[pauta.medio] = [];
      }
      this.itemsPorMedio[pauta.medio].push(pauta);
    });
    
    // Obtener medios activos y ordenarlos
    this.mediosActivos = Object.keys(this.itemsPorMedio).sort();
    
    console.log('📑 Items agrupados para pestañas:', this.itemsPorMedio);
    console.log('📑 Medios activos:', this.mediosActivos);
  }

  toggleGrupoMedio(medio: string): void {
    const grupo = this.itemsAgrupadosPorMedio.find(g => g.medio === medio);
    if (grupo) {
      grupo.expandido = !grupo.expandido;
    }
  }

  obtenerIconoMedio(medio: string): string {
    const iconos: { [key: string]: string } = {
      'TV NAL': 'tv',
      'Radio': 'radio',
      'Digital': 'computer',
      'Prensa': 'newspaper',
      'OOH': 'visibility',
      'default': 'campaign'
    };
    return iconos[medio] || iconos['default'];
  }

  // Obtener campos de plantilla por medio
  obtenerCamposPlantillaPorMedio(medio: string): CampoPlantilla[] {
    const plantilla = this.plantillaService.obtenerPlantillaPorMedio(medio);
    return plantilla ? plantilla.fields : [];
  }

  // Obtener columnas dinámicas para un medio específico
  obtenerColumnasDinamicas(medio: string): CampoPlantilla[] {
    // Verificar si al menos un item de este medio tiene datos de plantilla
    const itemsDelMedio = this.itemsPorMedio[medio] || [];
    const tieneAlgunItemConDatos = itemsDelMedio.some(item => 
      item.datos && Object.keys(item.datos).length > 0
    );
    
    if (!tieneAlgunItemConDatos) {
      console.log(`ℹ️ No se mostrarán columnas dinámicas para ${medio} - ningún item tiene dataPlantillaJson`);
      return [];
    }
    
    const campos = this.obtenerCamposPlantillaPorMedio(medio);
    // Filtrar campos que no queremos mostrar como columnas
    const camposExcluidos = ['semanas', 'iva', 'fee', '%_iva'];
    const columnas = campos.filter(campo => !camposExcluidos.includes(campo.name));
    
    console.log(`✅ Mostrando ${columnas.length} columnas dinámicas para ${medio}`);
    return columnas;
  }

  // Obtener valor de campo de una pauta
  obtenerValorCampo(pauta: RespuestaPauta, nombreCampo: string): any {
    return pauta.datos?.[nombreCampo] || '';
  }

  // Formatear valor de campo para mostrar
  formatearValorCampo(valor: any, campo: CampoPlantilla): string {
    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }

    switch (campo.type) {
      case 'money':
        const numValue = parseFloat(valor);
        if (isNaN(numValue)) return '-';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue);
      
      case 'decimal':
        const decValue = parseFloat(valor);
        if (isNaN(decValue)) return '-';
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(decValue);
      
      case 'integer':
        const intValue = parseInt(valor);
        if (isNaN(intValue)) return '-';
        return new Intl.NumberFormat('en-US').format(intValue);
      
      case 'time':
        return valor.toString();
      
      default:
        if (campo.lookupTable) {
          const opciones = this.obtenerOpcionesLookup(campo);
          const opcion = opciones.find(o => o.codigo == valor);
          return opcion ? opcion.valor : valor.toString();
        }
        return valor.toString();
    }
  }

  // Métodos obsoletos removidos - ahora usamos la estructura de items

  duplicarPauta(pautaOriginal: RespuestaPauta): void {
    const nuevaPauta: RespuestaPauta = {
      ...pautaOriginal,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
      diasSeleccionados: [],
      totalDiasSeleccionados: 0
    };
    
    // Agregar directamente a memoria
    this.itemsPauta.push(nuevaPauta);
    
    // Recargar pautas
    this.cargarPautasExistentes();
    
    this.snackBar.open('Pauta duplicada correctamente', '', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  getAllFields(datos: any): string[] {
    if (!datos) return [];
    
    return Object.keys(datos).filter(key => 
      key !== 'semanas' && datos[key] !== null && datos[key] !== undefined && datos[key] !== ''
    );
  }

  limpiarDatosPrueba(): void {
    if (confirm('¿Estás seguro de que deseas limpiar todas las pautas? Esta acción solo afecta la vista local.')) {
      // Limpiar datos en memoria (los datos del backend no se afectan)
      this.pautasGuardadas = [];
      this.itemsPauta = [];
      this.programacionItems = {};
      this.itemsPorMedio = {};
      this.mediosActivos = [];
      this.itemsAgrupadosPorMedio = [];
      
      this.cdr.detectChanges();
      
      this.snackBar.open('Vista limpiada correctamente (los datos del backend no se afectan)', '', {
        duration: 4000,
        panelClass: ['info-snackbar']
      });
      console.log('🧹 Vista de FlowChart limpiada (datos del backend intactos)');
    }
  }

  limpiarCachePlantillas(): void {
    this.templateDinamicoService.limpiarCache();
    this.snackBar.open('Cache de plantillas dinámicas limpiado', '', {
      duration: 2000,
      panelClass: ['info-snackbar']
    });
    console.log('🧹 Cache de plantillas dinámicas limpiado');
  }

  // 🚧 TEMPORAL: Probar carga de plantilla hardcodeada
  probarPlantillaHardcodeada(): void {
    const mediosParaProbar = ['TV NAL', 'Radio', 'Digital', 'Prensa', 'OOH'];
    
    console.log('🧪 === PROBANDO PLANTILLAS HARDCODEADAS ===');
    
    mediosParaProbar.forEach(medio => {
      this.templateDinamicoService.obtenerPlantillaPorMedio(medio).subscribe({
        next: (plantilla) => {
          if (plantilla) {
            console.log(`✅ ${medio}: ${plantilla.fields.length} campos`, plantilla.fields.map(c => c.name));
          } else {
            console.warn(`❌ ${medio}: No encontrado`);
          }
        },
        error: (error) => {
          console.error(`💥 ${medio}: Error`, error);
        }
      });
    });
    
    this.snackBar.open('Revisa la consola para ver las pruebas de plantillas', '', {
      duration: 4000,
      panelClass: ['info-snackbar']
    });
  }

  limpiarPlantillas(): void {
    if (confirm('¿Estás seguro de que deseas reinicializar todas las plantillas? Esta acción no se puede deshacer.')) {
      this.plantillaService.limpiarYReinicializarPlantillas();
      this.snackBar.open('Plantillas reinicializadas correctamente', '', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      console.log('🧹 Plantillas reinicializadas');
    }
  }

  descargarPlantillaPopup(): void {
    const planData = {};

    console.log('🔄 Abriendo modal para Descargar Plantilla Medio:', planData);

    const dialogRef = this.dialog.open(ModalDescargarPlantillaMedioComponent, {
      width: '600px',
      data: {
        planData,
        numSemanas: 1
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.shouldRefresh) {
        console.log('✅ Medio agregado, recargando resumen');
        // this.recargarResumen();
        // Marcar cambios pendientes tras agregar medio
        // this.cambiosPendientes = true;
      }
    });
  }
  // Verificar si las plantillas están actualizadas
  private verificarPlantillas(): void {
    const plantillas = this.plantillaService.obtenerTodasLasPlantillas();
    const mediosRequeridos = ['TV NAL', 'Radio', 'Digital', 'Prensa', 'OOH'];
    
    // Verificar si todas las plantillas existen
    const plantillasExistentes = plantillas.map(p => p.medio);
    const faltanPlantillas = mediosRequeridos.some(medio => !plantillasExistentes.includes(medio));
    
    if (faltanPlantillas || plantillas.length === 0) {
      console.log('🔄 Plantillas incompletas, inicializando...');
      this.plantillaService.limpiarYReinicializarPlantillas();
    }
  }

  // ✅ NUEVO: Convertir item del backend al formato local de FlowChart
  private convertirItemBackendALocal(item: PlanMedioItemFlowchartBackend): RespuestaPauta {
    console.log('🔄 Convirtiendo item backend a local:', item);
    console.log('🔄 DataPlantillaJson recibido:', item.dataPlantillaJson);
    console.log('🔄 CalendarioJson recibido:', item.calendarioJson);
    
    // Parsear DataPlantillaJson para obtener los campos dinámicos
    let datos: any = {};
    let tieneDataPlantilla = false;
    
    if (item.dataPlantillaJson && item.dataPlantillaJson.trim() !== '' && item.dataPlantillaJson !== 'null') {
      try {
        datos = JSON.parse(item.dataPlantillaJson);
        tieneDataPlantilla = Object.keys(datos).length > 0;
        console.log('✅ DataPlantillaJson parseado:', datos, 'tieneData:', tieneDataPlantilla);
      } catch (error) {
        console.error('❌ Error parseando DataPlantillaJson:', error);
        datos = {};
        tieneDataPlantilla = false;
      }
    } else {
      console.log('ℹ️ DataPlantillaJson vacío o null - no se crearán columnas dinámicas');
      datos = {};
      tieneDataPlantilla = false;
    }

    // Parsear CalendarioJson para obtener la programación
    let programacion: { [fecha: string]: number } = {};
    let tieneCalendario = false;
    
    if (item.calendarioJson && item.calendarioJson.trim() !== '' && item.calendarioJson !== 'null') {
      try {
        programacion = JSON.parse(item.calendarioJson);
        tieneCalendario = Object.keys(programacion).length > 0;
        console.log('✅ CalendarioJson parseado:', programacion, 'tieneCalendario:', tieneCalendario);
        
        // Guardar programación en el objeto global
        this.programacionItems[item.planMedioItemId.toString()] = programacion;
      } catch (error) {
        console.error('❌ Error parseando CalendarioJson:', error);
        programacion = {};
        tieneCalendario = false;
      }
    } else {
      console.log('ℹ️ CalendarioJson vacío o null - calendario se cargará con 0s');
      programacion = {};
      tieneCalendario = false;
      // Inicializar programación vacía para este item
      this.programacionItems[item.planMedioItemId.toString()] = {};
    }

    // Calcular totales desde la programación o usar valores por defecto
    const totalSpotsProgramados = Object.values(programacion).reduce((sum, spots) => sum + spots, 0);
    const valorTotal = datos.valor_total || datos.valorTotal || item.tarifa || 0;
    const totalSpotsDefault = totalSpotsProgramados || datos.total_spots || 1; // Al menos 1 spot por defecto

    // Crear objeto RespuestaPauta
    const pautaLocal: RespuestaPauta = {
      id: item.planMedioItemId.toString(),
      planId: item.planMedioId.toString(),
      medio: item.medioNombre,
      proveedor: item.proveedorNombre,
      proveedorId: item.proveedorId.toString(),
      plantillaId: item.medioId.toString(), // Usar medioId como plantillaId
      paisFacturacion: datos.pais || 'Default',
      fechaCreacion: item.fechaRegistro,
      fechaModificacion: item.fechaModificacion,
      datos: tieneDataPlantilla ? datos : {}, // Solo datos si hay información en DataPlantillaJson
      totalSpots: totalSpotsDefault,
      valorTotal: valorTotal,
      valorNeto: datos.valor_neto || valorTotal,
      semanas: datos.semanas || [],
      diasSeleccionados: Object.keys(programacion).filter(fecha => programacion[fecha] > 0),
      totalDiasSeleccionados: Object.keys(programacion).filter(fecha => programacion[fecha] > 0).length
    };

    console.log('✅ Item convertido a formato local:', pautaLocal);
    console.log('✅ Resumen conversión:', {
      id: pautaLocal.id,
      medio: pautaLocal.medio,
      tieneDataPlantilla,
      tieneCalendario,
      totalCamposDatos: Object.keys(pautaLocal.datos).length,
      totalSpots: totalSpotsDefault
    });
    
    return pautaLocal;
  }

  // ✅ NUEVO: Guardar programación en backend
  private guardarProgramacionEnBackend(planMedioItemId: number): void {
    const programacion = this.programacionItems[planMedioItemId.toString()];
    
    if (!programacion) {
      console.log('⚠️ No hay programación para guardar para item:', planMedioItemId);
      return;
    }

    const calendarioJson = JSON.stringify(programacion);
    
    const request = {
      planMedioItemId: planMedioItemId,
      calendarioJson: calendarioJson
    };

    console.log('💾 Guardando programación en backend:', request);

    // TODO: Usar el servicio cuando esté implementado
    // this.backendMediosService.actualizarCalendarioJson(request).subscribe({
    //   next: (response) => {
    //     console.log('✅ Programación guardada en backend:', response);
    //   },
    //   error: (error) => {
    //     console.error('❌ Error guardando programación en backend:', error);
    //   }
    // });
    
    console.log('💾 Programación preparada para backend (pendiente implementación)');
  }

  // ✅ FUNCIÓN DE DIAGNÓSTICO - Verificar estado de los datos
  diagnosticarEstadoDatos(): void {
    console.log('🔍 === DIAGNÓSTICO FlowChart ===');
    console.log('📊 Total items cargados:', this.itemsPauta.length);
    console.log('📊 Medios activos:', this.mediosActivos);
    
    this.itemsPauta.forEach(item => {
      const tieneDataPlantilla = item.datos && Object.keys(item.datos).length > 0;
      const programacion = this.programacionItems[item.id];
      const tieneCalendario = programacion && Object.keys(programacion).length > 0;
      
      console.log(`📋 Item ${item.id} (${item.medio}):`, {
        proveedor: item.proveedor,
        tieneDataPlantilla,
        camposDinamicos: Object.keys(item.datos || {}).length,
        tieneCalendario,
        totalSpotsProgramados: tieneCalendario ? Object.values(programacion).reduce((sum: number, spots: number) => sum + spots, 0) : 0,
        valorTotal: item.valorTotal
      });
    });
    
    console.log('🎯 Items por medio:', this.itemsPorMedio);
    console.log('🎯 Programación items:', Object.keys(this.programacionItems).length);
    
    // Diagnóstico de plantillas dinámicas
    console.log('🎯 Cache plantillas dinámicas:', this.templateDinamicoService.obtenerEstadisticasCache());
  }

  // ✅ RECARGAR DATOS FlowChart desde backend
  private recargarDatosFlowChart(): void {
    console.log('🔄 Recargando datos FlowChart desde backend...');
    this.cargarPautasExistentes();
  }

  // ✅ VALIDAR DUPLICADOS (medio + proveedor)
  private validarDuplicado(medioNombre: string, proveedorId: number, itemIdExcluir?: string): boolean {
    const duplicado = this.itemsPauta.find(item => 
      item.medio === medioNombre && 
      item.proveedorId === proveedorId.toString() && 
      item.id !== itemIdExcluir
    );
    
    if (duplicado) {
      console.warn('⚠️ Item duplicado encontrado:', { medioNombre, proveedorId, duplicado });
      return true;
    }
    
    return false;
  }

  // ✅ EXTRAER TARIFA de plantilla según medio
  private extraerTarifaDeFormulario(datosFormulario: any, medioNombre: string): number {
    console.log('💰 Extrayendo tarifa para medio:', medioNombre, 'datos:', datosFormulario);
    
    let tarifa = 0;
    
    switch (medioNombre.toUpperCase()) {
      case 'TV ABIERTA':
      case 'TV NAL':
        tarifa = parseFloat(datosFormulario['tarifaMiles'] || datosFormulario['netCost1'] || 0);
        break;
        
      case 'TV PAGA':
        tarifa = parseFloat(datosFormulario['netCost1'] || datosFormulario['invTotal'] || 0);
        break;
        
      case 'TV LOCAL':
        tarifa = parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost'] || 0);
        break;
        
      case 'RADIO':
        tarifa = parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost1'] || 0);
        break;
        
      case 'REVISTA':
      case 'PRENSA':
        tarifa = parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost'] || 0);
        break;
        
      case 'CINE':
      case 'OOH':
        tarifa = parseFloat(datosFormulario['tarifaBruta'] || datosFormulario['valor'] || datosFormulario['valorTotal'] || 0);
        break;
        
      case 'DIGITAL':
        tarifa = parseFloat(datosFormulario['budget'] || datosFormulario['costo'] || 0);
        break;
        
      default:
        // Buscar campos comunes como fallback
        tarifa = parseFloat(
          datosFormulario['tarifa'] || 
          datosFormulario['tarifa_bruta'] || 
          datosFormulario['valor_total'] || 
          datosFormulario['valorTotal'] || 
          datosFormulario['budget'] || 
          datosFormulario['costo'] || 
          0
        );
        console.warn('⚠️ Medio no reconocido, usando tarifa genérica:', tarifa);
        break;
    }
    
    console.log('💰 Tarifa extraída:', tarifa, 'para medio:', medioNombre);
    return tarifa || 0;
  }

  // ✅ VERIFICAR SI PLANTILLA ESTÁ INCOMPLETA
  estaPlantillaIncompleta(item: RespuestaPauta): boolean {
    // Si el item viene del backend, verificar el flag plantillaCompletada
    // Si no tiene datos de plantilla, está incompleta
    const tieneDataPlantilla = item.datos && Object.keys(item.datos).length > 0;
    return !tieneDataPlantilla;
  }

  // ✅ OBTENER ICONO DE ESTADO de plantilla
  obtenerIconoEstadoPlantilla(item: RespuestaPauta): string {
    return this.estaPlantillaIncompleta(item) ? 'warning' : 'check_circle';
  }

  // ✅ OBTENER TOOLTIP DE ESTADO de plantilla
  obtenerTooltipEstadoPlantilla(item: RespuestaPauta): string {
    return this.estaPlantillaIncompleta(item) ? 
      'Plantilla incompleta - Debe completar la información' : 
      'Plantilla completada';
  }

  // Métodos para el manejo de la grilla de calendario
  abrirModalNuevoItem(): void {
    const dialogRef = this.dialog.open(ModalNuevaPautaComponent, {
      width: '95%',
      maxWidth: '1400px',
      height: '95%',
      data: { 
        planData: this.planData,
        action: 'create',
        mediosDisponibles: this.mediosDisponibles
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.shouldRefresh) {
        console.log('✅ Nuevo item guardado, recargando lista');
        this.refrescarListaItems();
      }
    });
  }

  // Track functions para Angular
  trackByFecha(index: number, fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  trackByItem(index: number, item: RespuestaPauta): string {
    return item.id || index.toString();
  }

  // Funciones de fechas
  esFinDeSemana(fecha: Date): boolean {
    const dia = fecha.getDay();
    return dia === 0 || dia === 6; // Domingo = 0, Sábado = 6
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  }

  // Método para formatear fechas sin desfase de zona horaria
  formatearFechaSinDesfase(fechaString: string): string {
    if (!fechaString) return '';
    
    // Parsear la fecha como fecha local (sin conversión UTC)
    const partes = fechaString.split('-');
    const year = parseInt(partes[0]);
    const month = parseInt(partes[1]) - 1; // Los meses van de 0-11
    const day = parseInt(partes[2]);
    
    const fecha = new Date(year, month, day);
    
    // Formatear como dd/MM/yyyy
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    
    return `${dia}/${mes}/${año}`;
  }

  // Funciones de programación con spots numéricos
  tieneProgramacion(itemId: string, fecha: Date): boolean {
    const fechaStr = fecha.toISOString().split('T')[0];
    const spots = this.programacionItems[itemId]?.[fechaStr] || 0;
    return spots > 0;
  }

  obtenerSpotsPorFecha(itemId: string, fecha: Date): number | null {
    const fechaStr = fecha.toISOString().split('T')[0];
    const programacion = this.programacionItems[itemId];
    
    // Si no existe programación para este item, significa que CalendarioJson estaba vacío
    if (!programacion) {
      return 0; // Mostrar 0 cuando CalendarioJson viene vacío
    }
    
    // Si existe programación pero no hay datos para esta fecha específica
    const spots = programacion[fechaStr];
    if (spots === undefined || spots === null) {
      // Si la programación existe pero no tiene datos para esta fecha, mostrar input vacío
      return null;
    }
    
    // Si hay un valor específico (incluso si es 0), mostrarlo
    return spots;
  }

  actualizarSpotsPorFecha(itemId: string, fecha: Date, event: Event): void {
    const input = event.target as HTMLInputElement;
    const fechaStr = fecha.toISOString().split('T')[0];
    
    // Limpiar el valor de cualquier carácter no numérico
    let valorLimpio = input.value.replace(/[^0-9]/g, '');
    
    // Limitar a 4 dígitos máximo
    if (valorLimpio.length > 4) {
      valorLimpio = valorLimpio.substring(0, 4);
    }
    
    // Actualizar el input con el valor limpio
    if (input.value !== valorLimpio) {
      input.value = valorLimpio;
    }
    
    const spots = parseInt(valorLimpio) || 0;
    
    if (!this.programacionItems[itemId]) {
      this.programacionItems[itemId] = {};
    }
    
    // Si es 0 o vacío, eliminar la entrada, si no, guardar el valor
    if (spots === 0) {
      delete this.programacionItems[itemId][fechaStr];
      // Si el input está vacío, mantenerlo vacío en lugar de mostrar 0
      if (valorLimpio === '') {
        input.value = '';
      }
    } else {
      this.programacionItems[itemId][fechaStr] = spots;
    }
    
    // Guardar programación en memoria (ya está en this.programacionItems)
    
    // Actualizar automáticamente los datos de la pauta
    this.actualizarDatosPautaAutomaticamente(itemId);
    
    // Guardar programación en backend (si el itemId es numérico)
    if (!isNaN(Number(itemId))) {
      this.guardarProgramacionEnBackend(Number(itemId));
    }
    
    // Mostrar feedback visual de guardado
    this.mostrarFeedbackGuardado();
    
    console.log(`📅 Spots actualizados para item ${itemId} en fecha ${fechaStr}: ${spots}`);
  }

  /**
   * Actualiza automáticamente los datos de la pauta cuando cambian los spots
   */
  private actualizarDatosPautaAutomaticamente(itemId: string): void {
    // Buscar la pauta en memoria
    const itemLocal = this.itemsPauta.find(item => item.id === itemId);
    
    if (!itemLocal) return;
    
    // Calcular nuevos totales basados en la programación
    const totalSpotsProgramados = this.contarTotalSpotsProgramados(itemId);
    const spotsPorSemana = this.calcularSpotsPorSemana(itemId);
    
    // Actualizar los datos de la pauta
    itemLocal.totalSpots = totalSpotsProgramados;
    itemLocal.fechaModificacion = new Date().toISOString();
    
    // Actualizar datos internos si existen
    if (itemLocal.datos) {
      itemLocal.datos['totalSpots'] = totalSpotsProgramados;
      itemLocal.datos['spotsPorSemana'] = spotsPorSemana;
      itemLocal.datos['fechaModificacion'] = new Date().toISOString();
    }
    
    console.log(`📊 Pauta ${itemId} actualizada automáticamente: ${totalSpotsProgramados} spots totales`);
  }

  /**
   * Muestra feedback visual cuando se guardan los datos
   */
  private mostrarFeedbackGuardado(): void {
    // Crear elemento de feedback visual
    const feedbackElement = document.createElement('div');
    feedbackElement.innerHTML = '✅ Guardado';
    feedbackElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(feedbackElement);
    
    // Mostrar y ocultar el feedback
    setTimeout(() => {
      feedbackElement.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(feedbackElement);
      }, 300);
    }, 1500);
  }

  seleccionarTextoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.select();
    }
  }

  validarSoloNumeros(event: KeyboardEvent): boolean {
    const charCode = event.which || event.keyCode;
    
    // Permitir: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey === true) ||
        (charCode === 67 && event.ctrlKey === true) ||
        (charCode === 86 && event.ctrlKey === true) ||
        (charCode === 88 && event.ctrlKey === true)) {
      return true;
    }
    
    // Solo permitir números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    
    return true;
  }

  validarPegado(event: ClipboardEvent): void {
    event.preventDefault();
    
    const clipboardData = event.clipboardData?.getData('text') || '';
    
    // Verificar que solo contenga números
    if (/^\d+$/.test(clipboardData)) {
      const input = event.target as HTMLInputElement;
      const numero = parseInt(clipboardData);
      
      // Verificar que no exceda el máximo (9999)
      if (numero <= 9999) {
        input.value = numero.toString();
        
        // Disparar evento de input manualmente
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
      }
    }
  }

  // Métodos eliminados - programación se mantiene solo en memoria

  // Funciones de expansión
  toggleExpandirItem(itemId: string): void {
    this.itemsExpandidos[itemId] = !this.itemsExpandidos[itemId];
  }

  expandirTodosLosItems(): void {
    this.itemsPauta.forEach(item => {
      this.itemsExpandidos[item.id] = true;
    });
  }

  contraerTodosLosItems(): void {
    this.itemsPauta.forEach(item => {
      this.itemsExpandidos[item.id] = false;
    });
  }

  // Funciones de datos de items
  obtenerVehiculo(item: RespuestaPauta): string {
    if (!item.datos) return '-';
    
    // Buscar campos relacionados con vehículo
    const vehiculoFields = ['IdVehiculo', 'vehiculo', 'canal', 'estacion'];
    for (const field of vehiculoFields) {
      const key = Object.keys(item.datos).find(k => k.toLowerCase().includes(field.toLowerCase()));
      if (key && item.datos[key]) {
        return item.datos[key].toString();
      }
    }
    
    return '-';
  }

  obtenerPrograma(item: RespuestaPauta): string {
    if (!item.datos) return '-';
    
    // Buscar campos relacionados con programa
    const programaFields = ['programa', 'show', 'espacio', 'franja'];
    for (const field of programaFields) {
      const key = Object.keys(item.datos).find(k => k.toLowerCase().includes(field.toLowerCase()));
      if (key && item.datos[key]) {
        return item.datos[key].toString();
      }
    }
    
    return '';
  }

  // Funciones de estadísticas
  contarDiasProgramados(itemId: string): number {
    const programacion = this.programacionItems[itemId];
    if (!programacion) return 0;
    
    return Object.values(programacion).filter(spots => spots > 0).length;
  }

  contarTotalSpotsProgramados(itemId: string): number {
    const programacion = this.programacionItems[itemId];
    if (!programacion) return 0;
    
    return Object.values(programacion).reduce((total, spots) => total + spots, 0);
  }

  calcularCostoPorDia(item: RespuestaPauta): number {
    const diasProgramados = this.contarDiasProgramados(item.id);
    if (diasProgramados === 0) return 0;
    
    return (item.valorTotal || 0) / diasProgramados;
  }

  calcularSpotsPorDia(item: RespuestaPauta): number {
    const diasProgramados = this.contarDiasProgramados(item.id);
    if (diasProgramados === 0) return 0;
    
    return Math.ceil((item.totalSpots || 0) / diasProgramados);
  }

  calcularCostoPorSpot(item: RespuestaPauta): number {
    const totalSpotsProgramados = this.contarTotalSpotsProgramados(item.id);
    if (totalSpotsProgramados === 0) return 0;
    
    return (item.valorTotal || 0) / totalSpotsProgramados;
  }

  calcularPromedioSpotsPorDia(item: RespuestaPauta): number {
    const diasProgramados = this.contarDiasProgramados(item.id);
    if (diasProgramados === 0) return 0;
    
    const totalSpotsProgramados = this.contarTotalSpotsProgramados(item.id);
    return totalSpotsProgramados / diasProgramados;
  }

  calcularPresupuestoTotal(medio?: string): number {
    const items = medio ? this.itemsPorMedio[medio] || [] : this.itemsPauta;
    return items.reduce((total, item) => total + (item.valorTotal || 0), 0);
  }

  contarDiasConProgramacion(medio?: string): number {
    const todasLasFechas = new Set<string>();
    const items = medio ? this.itemsPorMedio[medio] || [] : this.itemsPauta;
    
    items.forEach(item => {
      const programacion = this.programacionItems[item.id];
      if (programacion) {
        Object.keys(programacion).forEach(fecha => {
          if (programacion[fecha] > 0) {
            todasLasFechas.add(fecha);
          }
        });
      }
    });
    
    return todasLasFechas.size;
  }

  calcularTotalSpots(medio?: string): number {
    const items = medio ? this.itemsPorMedio[medio] || [] : this.itemsPauta;
    return items.reduce((total, item) => {
      const spotsProgramados = this.contarTotalSpotsProgramados(item.id);
      return total + spotsProgramados;
    }, 0);
  }

  calcularTotalSpotsOriginales(medio?: string): number {
    const items = medio ? this.itemsPorMedio[medio] || [] : this.itemsPauta;
    return items.reduce((total, item) => total + (item.totalSpots || 0), 0);
  }

  // Funciones de acciones
  editarItem(item: RespuestaPauta): void {
    const dialogRef = this.dialog.open(ModalNuevaPautaComponent, {
      width: '95%',
      maxWidth: '1400px',
      height: '95%',
      data: { 
        planData: this.planData,
        action: 'edit',
        pautaData: item,
        mediosDisponibles: this.mediosDisponibles
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.shouldRefresh) {
        console.log('✅ Item editado, recargando lista');
        this.refrescarListaItems();
        
        this.snackBar.open('Item actualizado exitosamente', '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  duplicarItem(item: RespuestaPauta): void {
    const itemDuplicado = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // Agregar directamente a memoria
    this.itemsPauta.push(itemDuplicado);
    this.refrescarListaItems();
    
    this.snackBar.open('Item duplicado exitosamente', '', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
  }

  eliminarItem(itemId: string, index: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este item?')) {
      // Eliminar de memoria
      this.itemsPauta = this.itemsPauta.filter(item => item.id !== itemId);
      
      // Limpiar programación del item eliminado
      delete this.programacionItems[itemId];
      
      this.refrescarListaItems();
      
      this.snackBar.open('Item eliminado exitosamente', '', { 
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    }
  }

  // Funciones de utilidad
  exportarProgramacion(): void {
    this.snackBar.open('Funcionalidad de exportación próximamente', '', { duration: 2000 });
  }

  importarDatos(): void {
    this.snackBar.open('Funcionalidad de importación próximamente', '', { duration: 2000 });
  }

  exportarPlan(): void {
    this.snackBar.open('Funcionalidad de exportación próximamente', '', { duration: 2000 });
  }

  programacionMasiva(): void {
    this.snackBar.open('Funcionalidad de programación masiva próximamente', '', { duration: 2000 });
  }
}

// Componente Modal para Nueva Pauta
@Component({
  selector: 'app-modal-nueva-pauta',
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon>{{ data.action === 'edit' ? 'edit' : 'add_circle' }}</mat-icon>
        {{ data.action === 'edit' ? 'Editar' : 'Nueva' }} Pauta - Plan {{ data.planData?.numeroPlan }}
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

      <!-- Selección de Medio -->
      <mat-card class="selection-card">
        <mat-card-header class="compact-header">
          <mat-card-title class="compact-title">Seleccionar Medio</mat-card-title>
        </mat-card-header>
        <mat-card-content class="compact-content">
          <form [formGroup]="seleccionForm">
            <mat-form-field class="full-width">
              <mat-label>Medio</mat-label>
              <mat-select 
                formControlName="medio" 
                [disabled]="data.action === 'edit' || cargandoMedios">
                <mat-option *ngFor="let medio of mediosDisponibles" [value]="medio">
                  {{ medio.nombre }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="cargandoMedios">Cargando medios...</mat-hint>
              <mat-hint *ngIf="data.action === 'edit'" class="edit-hint">
                <mat-icon class="hint-icon">info</mat-icon>
                El medio no se puede cambiar durante la edición
              </mat-hint>
            </mat-form-field>

            <mat-form-field class="full-width" *ngIf="seleccionForm.get('medio')?.value">
              <mat-label>Proveedor</mat-label>
              <mat-select 
                formControlName="proveedor"
                [disabled]="data.action === 'edit' || cargandoProveedores">
                <mat-option *ngFor="let proveedor of proveedoresDisponibles" [value]="proveedor.id">
                  {{ proveedor.VENDOR }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="cargandoProveedores">Cargando proveedores...</mat-hint>
              <mat-hint *ngIf="data.action === 'edit'">
                El proveedor no se puede cambiar durante la edición
              </mat-hint>
            </mat-form-field>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Estado de Carga -->
      <div class="loading-container" *ngIf="cargandoPlantilla">
        <mat-icon class="loading-spinner">refresh</mat-icon>
        <h3>Cargando formulario...</h3>
      </div>

      <!-- Mensaje de Error -->
      <div class="error-container" *ngIf="errorPlantilla && !cargandoPlantilla">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Plantilla no disponible</h3>
        <p>{{ errorPlantilla }}</p>
      </div>

      <!-- Formulario Dinámico -->
      <mat-card class="form-card" *ngIf="plantillaActual && !cargandoPlantilla && !errorPlantilla">
        <mat-card-header class="compact-header">
          <mat-card-title class="compact-title">{{ plantillaActual.nombre }}</mat-card-title>
          <mat-card-subtitle class="compact-subtitle">{{ plantillaActual.descripcion }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content class="compact-content">
          <form [formGroup]="pautaForm">
            <!-- Campos Dinámicos -->
            <div class="form-grid">
              <ng-container *ngFor="let campo of plantillaActual.fields">
                
                <!-- Campo de Input -->
                <mat-form-field *ngIf="esInputField(campo)" class="compact-field">
                  <mat-label>{{ campo.label }}</mat-label>
                  <input 
                    matInput 
                    [formControlName]="campo.name"
                    [type]="obtenerTipoCampo(campo)"
                    [step]="campo.type === 'decimal' || campo.type === 'money' ? '0.01' : null">
                </mat-form-field>

                <!-- Campo Select con Opciones Fijas -->
                <mat-form-field *ngIf="esSelectField(campo)" class="compact-field">
                  <mat-label>{{ campo.label }}</mat-label>
                  <mat-select [formControlName]="campo.name">
                    <mat-option *ngFor="let opcion of campo.options" [value]="opcion">
                      {{ opcion }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Campo Select con Lookup -->
                <mat-form-field *ngIf="esLookupField(campo)" class="compact-field">
                  <mat-label>{{ campo.label }}</mat-label>
                  <mat-select [formControlName]="campo.name">
                    <mat-option *ngFor="let item of obtenerOpcionesLookup(campo)" [value]="item.codigo">
                      {{ item.valor }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

              </ng-container>
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
        [disabled]="!plantillaActual || cargandoPlantilla"
        (click)="guardarPauta()">
        <mat-icon>save</mat-icon>
        {{ data.action === 'edit' ? 'Actualizar' : 'Guardar' }} Pauta
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    .modal-content {
      padding: 10px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .plan-info {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .label {
      font-size: 10px;
      color: #666;
      font-weight: 500;
    }

    .value {
      font-size: 12px;
      font-weight: 600;
    }

    .selection-card, .form-card {
      margin-bottom: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
    }

    .compact-header {
      padding: 6px 12px !important;
      min-height: auto !important;
    }

    .compact-title {
      font-size: 13px !important;
      font-weight: 500 !important;
      margin: 0 !important;
      line-height: 1.3 !important;
    }

    .compact-subtitle {
      font-size: 11px !important;
      margin: 0 !important;
      margin-top: 1px !important;
      line-height: 1.2 !important;
    }

    .compact-content {
      padding: 8px 12px !important;
      padding-top: 4px !important;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 6px;
      margin-top: 4px;
    }

    .compact-field {
      margin-bottom: 4px !important;
    }

    .compact-field .mat-mdc-form-field-infix {
      padding: 8px 0 6px 0 !important;
      min-height: auto !important;
    }

    .compact-field .mat-mdc-form-field-label {
      font-size: 12px !important;
    }

    .compact-field .mat-mdc-form-field-input-control input,
    .compact-field .mat-mdc-form-field-input-control .mat-mdc-select-value {
      font-size: 13px !important;
      line-height: 1.3 !important;
    }

    .compact-field .mat-mdc-form-field-underline {
      bottom: 6px !important;
    }

    .compact-field .mat-mdc-select-arrow-wrapper {
      transform: translateY(-50%) scale(0.8) !important;
    }

    .compact-field .mat-mdc-select-trigger {
      min-height: auto !important;
      height: 20px !important;
    }

    .compact-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0 !important;
    }

    .compact-field .mat-mdc-form-field-flex {
      align-items: center !important;
      min-height: 36px !important;
    }

    .full-width {
      width: 100%;
    }

    .loading-container, .error-container {
      text-align: center;
      padding: 20px;
    }

    .loading-spinner {
      animation: spin 1s linear infinite;
      font-size: 48px;
      color: #1976d2;
    }

    .error-icon {
      font-size: 48px;
      color: #f44336;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .modal-actions {
      padding: 8px 16px;
      border-top: 1px solid #e0e0e0;
      justify-content: flex-end;
      gap: 8px;
    }

    .modal-actions button {
      font-size: 13px !important;
      padding: 6px 16px !important;
      min-height: 32px !important;
    }
  `]
})
export class ModalNuevaPautaComponent implements OnInit {
  seleccionForm!: FormGroup;
  pautaForm!: FormGroup;
  plantillaActual: PlantillaPauta | null = null;
  cargandoPlantilla: boolean = false;
  errorPlantilla: string | null = null;
  private lookupCache = new Map<string, any[]>();
  
  // Medios y proveedores cargados dinámicamente desde backend
  todosLosMedios: MedioBackend[] = [];
  mediosDisponibles: MedioBackend[] = [];
  proveedoresDisponibles: any[] = [];
  
  // Estados de carga
  cargandoMedios: boolean = true;
  cargandoProveedores: boolean = false;

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaPautaService,
    private templateDinamicoService: TemplateDinamicoService,
    private backendMediosService: BackendMediosService,
    private dialogRef: MatDialogRef<ModalNuevaPautaComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.seleccionForm = this.fb.group({
      medio: [''],
      proveedor: ['']
    });

    this.seleccionForm.get('medio')?.valueChanges.subscribe(medioSeleccionado => {
      if (medioSeleccionado) {
        console.log('🔄 Medio seleccionado:', medioSeleccionado);
        this.onMedioChange(medioSeleccionado);
      } else {
        this.proveedoresDisponibles = [];
        this.plantillaActual = null;
        this.errorPlantilla = null;
        this.cargandoPlantilla = false;
        this.pautaForm = this.fb.group({});
      }
    });
  }

  ngOnInit(): void {
    this.cargandoPlantilla = false;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    // Cargar medios desde backend
    this.cargarMediosDisponibles();
    
    // Si es modo edición, cargar los datos existentes
    if (this.data.action === 'edit' && this.data.pautaData) {
      console.log('🔄 Modo edición detectado, cargando datos:', this.data.pautaData);
      this.seleccionForm.patchValue({
        medio: this.data.pautaData.medio,
        proveedor: this.data.pautaData.proveedorId || ''
      });
      // Cargar proveedores y plantilla automáticamente en modo edición
      this.cargarProveedoresPorMedio(this.data.pautaData.medio);
      this.cargarPlantillaPorMedio(this.data.pautaData.medio);
    }
  }

  private cargarMediosDisponibles(): void {
    this.cargandoMedios = true;
    console.log('🔄 Cargando medios desde backend...');
    
    this.backendMediosService.getMedios().subscribe({
      next: (medios) => {
        this.todosLosMedios = medios.filter(m => m.estado); // Solo medios activos
        this.filtrarMediosDisponibles();
        console.log('✅ Medios cargados:', this.todosLosMedios.length);
      },
      error: (error) => {
        console.error('❌ Error cargando medios:', error);
        this.todosLosMedios = [];
        this.mediosDisponibles = [];
      },
      complete: () => {
        this.cargandoMedios = false;
      }
    });
  }

  private filtrarMediosDisponibles(): void {
    if (this.data.action === 'edit') {
      // En modo edición, encontrar el medio actual
      const medioActual = this.todosLosMedios.find(m => m.nombre === this.data.pautaData.medio);
      this.mediosDisponibles = medioActual ? [medioActual] : [];
      return;
    }
    
    // En modo creación, mostrar todos los medios activos
    this.mediosDisponibles = this.todosLosMedios;
  }

  cargarPlantillaPorMedio(medioNombre: string): void {
    this.cargandoPlantilla = true;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    console.log('🔄 Modal: Cargando plantilla dinámica para medio:', medioNombre);
    
    // Usar el servicio dinámico
    this.templateDinamicoService.obtenerPlantillaPorMedio(medioNombre).subscribe({
      next: (plantilla) => {
        if (plantilla) {
          this.plantillaActual = plantilla;
          this.generarFormulario();
          this.configurarCalculosAutomaticos();
          this.errorPlantilla = null;
          console.log('✅ Modal: Plantilla dinámica cargada:', plantilla);
        } else {
          this.errorPlantilla = `No se encontró plantilla en el backend para "${medioNombre}". ` +
                               `Verifica que el medio tenga una plantilla configurada.`;
          this.pautaForm = this.fb.group({});
          console.warn('⚠️ Modal: No se encontró plantilla para medio:', medioNombre);
        }
      },
      error: (error) => {
        console.error('❌ Modal: Error cargando plantilla dinámica:', error);
        this.errorPlantilla = `Error conectando con el backend. Intenta nuevamente.`;
        this.plantillaActual = null;
        this.pautaForm = this.fb.group({});
      },
      complete: () => {
        this.cargandoPlantilla = false;
      }
    });
  }

  generarFormulario(): void {
    if (!this.plantillaActual) {
      this.pautaForm = this.fb.group({});
      return;
    }

    const formConfig: { [key: string]: any } = {};
    const isEdit = this.data.action === 'edit';
    const datosExistentes = this.data.pautaData?.datos || {};

    console.log('📝 Generando formulario:', { 
      isEdit, 
      campos: this.plantillaActual.fields.length,
      datosExistentes: Object.keys(datosExistentes).length
    });

    for (const campo of this.plantillaActual.fields) {
      let valorInicial = campo.defaultValue || '';
      
      // Si es modo edición y hay datos existentes del DataPlantillaJson
      if (isEdit && datosExistentes && datosExistentes.hasOwnProperty(campo.name)) {
        valorInicial = datosExistentes[campo.name];
        console.log(`📝 Campo ${campo.name}: cargando valor existente:`, valorInicial);
      } else if (isEdit) {
        console.log(`📝 Campo ${campo.name}: usando valor por defecto (no existe en datos)`);
      }
      
      formConfig[campo.name] = [valorInicial];
    }

    this.pautaForm = this.fb.group(formConfig);
    
    console.log('📝 Formulario generado con plantilla dinámica:', {
      totalCampos: Object.keys(formConfig).length,
      valoresFormulario: this.pautaForm.value,
      isEdit: isEdit
    });
  }

  configurarCalculosAutomaticos(): void {
    if (!this.pautaForm) return;

    this.pautaForm.valueChanges.subscribe(valores => {
      this.calcularMontos(valores);
    });
  }

  calcularMontos(valores: any): void {
    const tarifaBruta = parseFloat(valores.tarifa_bruta_30 || valores.tarifa_bruta || 0);
    const dtoCliente = parseFloat(valores.dto_cliente || 0);
    const dtoAgencia = parseFloat(valores.dto_agencia || 0);
    const totalSpots = parseInt(valores.total_spots || 1);
    const duracionReal = parseInt(valores.duracion_real || 30);
    
    if (tarifaBruta > 0) {
      const factorDuracion = duracionReal / 30;
      const valorSpot = tarifaBruta * factorDuracion;
      const descuentoTotal = (dtoCliente + dtoAgencia) / 100;
      const valorNeto = valorSpot * (1 - descuentoTotal);
      const valorTotal = valorNeto * totalSpots;
      const iva = valorTotal * 0.18;

      this.pautaForm.patchValue({
        valor_spot: Math.round(valorSpot),
        valor_neto: Math.round(valorNeto),
        valor_total: Math.round(valorTotal),
        iva: Math.round(iva)
      }, { emitEvent: false });
    }
  }

  obtenerOpcionesLookup(campo: CampoPlantilla): any[] {
    if (!campo.lookupTable) return [];
    
    const cacheKey = `${campo.lookupTable}_${campo.lookupCategory || ''}`;
    
    if (this.lookupCache.has(cacheKey)) {
      return this.lookupCache.get(cacheKey)!;
    }
    
    const opciones = this.plantillaService.obtenerDatosLookup(
      campo.lookupTable, 
      campo.lookupCategory
    );
    
    this.lookupCache.set(cacheKey, opciones);
    return opciones;
  }

  esInputField(campo: any): boolean {
    return ['integer', 'string', 'decimal', 'money', 'time'].includes(campo.type) && !campo.options && !campo.lookupTable;
  }

  esSelectField(campo: any): boolean {
    return campo.options && campo.options.length > 0;
  }

  esLookupField(campo: any): boolean {
    return !!campo.lookupTable;
  }

  onMedioChange(medioSeleccionado: MedioBackend): void {
    if (medioSeleccionado && medioSeleccionado.nombre) {
      this.cargandoProveedores = true;
      console.log('🔄 Cargando proveedores para medio:', medioSeleccionado.nombre);
      this.seleccionForm.patchValue({ proveedor: '' });
      this.cargarProveedoresPorMedio(medioSeleccionado.nombre);
      this.cargarPlantillaPorMedio(medioSeleccionado.nombre);
    }
  }

  cargarProveedoresPorMedio(medio: string): void {
    this.cargandoProveedores = true;
    this.proveedoresDisponibles = this.plantillaService.obtenerProveedoresPorMedio(medio);
    this.cargandoProveedores = false;
    console.log('✅ Proveedores cargados para', medio, ':', this.proveedoresDisponibles.length);
  }

  obtenerTipoCampo(campo: CampoPlantilla): string {
    switch (campo.type) {
      case 'integer':
      case 'decimal':
      case 'money':
        return 'number';
      case 'time':
        return 'time';
      default:
        return 'text';
    }
  }

  guardarPauta(): void {
    if (!this.plantillaActual) {
      this.snackBar.open('Error: No hay plantilla cargada', '', { duration: 3000 });
      return;
    }

    const valores = this.pautaForm.value;
    const isEdit = this.data.action === 'edit';
    
    console.log(`💾 === ${isEdit ? 'EDITANDO' : 'GUARDANDO'} PAUTA ===`);
    console.log('💾 Valores del formulario:', valores);
    console.log('💾 Plan Data completo:', this.data.planData);
    console.log('💾 Datos existentes (si edición):', this.data.pautaData);
    
    // Asegurar que el plan tenga un ID
    let planId = this.data.planData.id;
    if (!planId) {
      planId = `${this.data.planData.numeroPlan}-v${this.data.planData.version}`;
      console.log('💾 ID generado para el plan:', planId);
    }
    
    // Ya no validamos medios únicos - se permite repetir medios con diferentes proveedores
    
    // Obtener información del medio y proveedor seleccionados
    const medioSeleccionado = this.seleccionForm.get('medio')?.value as MedioBackend;
    const proveedorId = this.seleccionForm.get('proveedor')?.value;
    let proveedorNombre = '';
    if (proveedorId) {
      const proveedor = this.proveedoresDisponibles.find(p => p.id === proveedorId);
      proveedorNombre = proveedor ? proveedor.VENDOR : '';
    }

    const pauta: RespuestaPauta = {
      id: isEdit ? this.data.pautaData.id : Date.now().toString(),
      planId: planId,
      plantillaId: this.plantillaActual.id,
      paisFacturacion: this.plantillaActual.paisFacturacion,
      medio: medioSeleccionado?.nombre || this.plantillaActual.medio,
      proveedor: proveedorNombre,
      proveedorId: proveedorId,
      datos: valores,
      fechaCreacion: isEdit ? this.data.pautaData.fechaCreacion : new Date().toISOString(),
      fechaModificacion: isEdit ? new Date().toISOString() : undefined,
      valorTotal: valores.valor_total || 0,
      valorNeto: valores.valor_neto || 0,
      totalSpots: valores.total_spots || 1,
      diasSeleccionados: isEdit ? (this.data.pautaData.diasSeleccionados || []) : [],
      totalDiasSeleccionados: isEdit ? (this.data.pautaData.totalDiasSeleccionados || 0) : 0
    };

    console.log(`💾 Pauta construida para ${isEdit ? 'actualizar' : 'guardar'}:`, pauta);
    
    if (isEdit) {
      this.actualizarPautaEnBackend(pauta);
    } else {
      this.guardarPautaEnBackend(pauta);
    }
    
    // Los datos se mantienen solo en memoria hasta implementar backend
    console.log('✅ Item guardado en memoria (pendiente integración con backend)');
    
    this.snackBar.open(`Item ${isEdit ? 'actualizado' : 'guardado'} correctamente`, '', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
    
    this.dialogRef.close({ pauta: pauta, shouldRefresh: true });
  }

  private guardarPautaEnBackend(pauta: RespuestaPauta): void {
    if (!this.data.planData) {
      throw new Error('No hay datos del plan');
    }

    // Obtener información del medio y proveedor
    const medioSeleccionado = this.seleccionForm.get('medio')?.value as MedioBackend;
    const proveedorId = Number(this.seleccionForm.get('proveedor')?.value);

    if (!medioSeleccionado || !proveedorId) {
      throw new Error('Medio y proveedor son requeridos');
    }

    // ✅ VALIDAR DUPLICADOS antes de crear
    const parentComponent = this.getParentFlowChartComponent();
    if (parentComponent && parentComponent.validarDuplicado(medioSeleccionado.nombre, proveedorId)) {
      throw new Error(`Ya existe un item para ${medioSeleccionado.nombre} con este proveedor`);
    }

    // Extraer tarifa del formulario
    const tarifa = this.extractTarifaFromFormulario(pauta.datos, medioSeleccionado.nombre);

    const request: CrearPlanMedioItemFlowchartRequest = {
      planMedioId: Number(this.data.planData.id),
      version: Number(this.data.planData.version),
      medioId: medioSeleccionado.medioId,
      proveedorId: proveedorId,
      tarifa: tarifa,
      dataJson: JSON.stringify({}), // JSON básico
      dataPlantillaJson: JSON.stringify(pauta.datos), // Datos de la plantilla
      usuarioRegistro: 'SYSTEM' // TODO: Usuario real
    };

    console.log('💾 Creando item en backend:', request);

    this.backendMediosService.crearPlanMedioItemFlowchart(request).subscribe({
      next: (response) => {
        console.log('✅ Item creado en backend:', response);
        this.snackBar.open('✅ Item guardado exitosamente', '', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('❌ Error guardando en backend:', error);
        throw error;
      }
    });
  }

  private actualizarPautaEnBackend(pautaActualizada: RespuestaPauta): void {
    if (!this.data.planData) {
      throw new Error('No hay datos del plan');
    }

    // Obtener información del medio y proveedor
    const medioSeleccionado = this.seleccionForm.get('medio')?.value as MedioBackend;
    const proveedorId = Number(this.seleccionForm.get('proveedor')?.value);

    if (!medioSeleccionado || !proveedorId) {
      throw new Error('Medio y proveedor son requeridos');
    }

    // ✅ VALIDAR DUPLICADOS antes de actualizar
    const parentComponent = this.getParentFlowChartComponent();
    if (parentComponent && parentComponent.validarDuplicado(medioSeleccionado.nombre, proveedorId, pautaActualizada.id)) {
      throw new Error(`Ya existe otro item para ${medioSeleccionado.nombre} con este proveedor`);
    }

    // Extraer tarifa del formulario
    const tarifa = this.extractTarifaFromFormulario(pautaActualizada.datos, medioSeleccionado.nombre);

    const request: ActualizarPlanMedioItemFlowchartRequest = {
      planMedioItemId: Number(pautaActualizada.id),
      planMedioId: Number(this.data.planData.id),
      version: Number(this.data.planData.version),
      medioId: medioSeleccionado.medioId,
      proveedorId: proveedorId,
      tarifa: tarifa,
      dataJson: JSON.stringify({}), // JSON básico
      pasoPorFlowchart: true, // ✅ Siempre true cuando se guarda desde FlowChart
      plantillaCompletada: true, // ✅ Siempre true cuando se completa la plantilla
      dataPlantillaJson: JSON.stringify(pautaActualizada.datos), // Datos de la plantilla
      usuarioModifico: 'SYSTEM' // TODO: Usuario real
    };

    console.log('🔄 Actualizando item en backend:', request);

    this.backendMediosService.actualizarPlanMedioItemFlowchart(request).subscribe({
      next: (response) => {
        console.log('✅ Item actualizado en backend:', response);
        this.snackBar.open('✅ Item actualizado exitosamente', '', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('❌ Error actualizando en backend:', error);
        throw error;
      }
    });
  }

  // ✅ OBTENER REFERENCIA al componente padre FlowChart
  private getParentFlowChartComponent(): any {
    // TODO: Implementar referencia al componente padre para validaciones
    return null;
  }

  // ✅ EXTRAER TARIFA del formulario según medio
  private extractTarifaFromFormulario(datosFormulario: any, medioNombre: string): number {
    console.log('💰 Extrayendo tarifa para medio:', medioNombre);
    
    switch (medioNombre.toUpperCase()) {
      case 'TV ABIERTA':
      case 'TV NAL':
        return parseFloat(datosFormulario['tarifaMiles'] || datosFormulario['netCost1'] || 0);
      case 'TV PAGA':
        return parseFloat(datosFormulario['netCost1'] || datosFormulario['invTotal'] || 0);
      case 'TV LOCAL':
        return parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost'] || 0);
      case 'RADIO':
        return parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost1'] || 0);
      case 'REVISTA':
      case 'PRENSA':
        return parseFloat(datosFormulario['tarifa'] || datosFormulario['netCost'] || 0);
      case 'CINE':
      case 'OOH':
        return parseFloat(datosFormulario['tarifaBruta'] || datosFormulario['valor'] || datosFormulario['valorTotal'] || 0);
      case 'DIGITAL':
        return parseFloat(datosFormulario['budget'] || datosFormulario['costo'] || 0);
      default:
        return parseFloat(datosFormulario['tarifa'] || datosFormulario['valor_total'] || 0);
    }
  }
}

// Componente Modal para Calendario
@Component({
  selector: 'app-modal-calendario-pauta',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="modal-header">
      <h2 mat-dialog-title>
        <mat-icon>event</mat-icon>
        Calendario de Pauta - {{ data.pauta.medio }}
      </h2>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="pauta-info">
        <h3>Información de la Pauta</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Medio:</span>
            <span class="value">{{ data.pauta.medio }}</span>
          </div>
          <div class="info-item">
            <span class="label">Valor Total:</span>
            <span class="value">{{ data.pauta.valorTotal | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Total Spots:</span>
            <span class="value">{{ data.pauta.totalSpots }}</span>
          </div>
          <div class="info-item">
            <span class="label">Días Seleccionados:</span>
            <span class="value">{{ diasSeleccionados.length }}</span>
          </div>
        </div>
      </div>

      <div class="periodo-vigencia">
        <h3>Período de Vigencia del Plan</h3>
        <p><strong>Desde:</strong> {{ fechaInicioPlan | date:'dd/MM/yyyy' }}</p>
        <p><strong>Hasta:</strong> {{ fechaFinPlan | date:'dd/MM/yyyy' }}</p>
      </div>

      <div class="calendario-container">
        <h3>Seleccionar Días de Pauta</h3>
        <div class="calendario-grid">
          <div 
            *ngFor="let dia of diasCalendario" 
            class="dia-item"
            [class.seleccionado]="dia.seleccionado"
            [class.deshabilitado]="!dia.habilitado"
            (click)="toggleDia(dia)">
            <div class="dia-numero">{{ dia.fecha.getDate() }}</div>
            <div class="dia-mes">{{ obtenerNombreMes(dia.fecha.getMonth()) }}</div>
            <mat-checkbox 
              [checked]="dia.seleccionado"
              [disabled]="!dia.habilitado"
              (click)="$event.stopPropagation()">
            </mat-checkbox>
          </div>
        </div>
      </div>

      <div class="resumen-seleccion" *ngIf="diasSeleccionados.length > 0">
        <h3>Resumen de Selección</h3>
        <p><strong>Total de días seleccionados:</strong> {{ diasSeleccionados.length }}</p>
        <p><strong>Costo por día:</strong> {{ (data.pauta.valorTotal / diasSeleccionados.length) | currency:'USD':'symbol-narrow':'1.0-0' }}</p>
        <div class="dias-seleccionados">
          <span *ngFor="let fecha of diasSeleccionados" class="dia-tag">
            {{ fecha | date:'dd/MM' }}
          </span>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="diasSeleccionados.length === 0"
        (click)="guardarCalendario()">
        <mat-icon>save</mat-icon>
        Guardar Calendario ({{ diasSeleccionados.length }} días)
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-content {
      padding: 20px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .pauta-info, .periodo-vigencia {
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
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
      font-weight: 600;
    }

    .calendario-container {
      margin-bottom: 24px;
    }

    .calendario-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .dia-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
    }

    .dia-item:hover:not(.deshabilitado) {
      border-color: #1976d2;
      background: #f3f7ff;
    }

    .dia-item.seleccionado {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .dia-item.deshabilitado {
      opacity: 0.5;
      cursor: not-allowed;
      background: #fafafa;
    }

    .dia-numero {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .dia-mes {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .resumen-seleccion {
      padding: 16px;
      background: #e8f5e8;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    }

    .dias-seleccionados {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .dia-tag {
      background: #1976d2;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .modal-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      justify-content: flex-end;
      gap: 12px;
    }
  `]
})
export class ModalCalendarioPautaComponent implements OnInit {
  diasCalendario: DiaCalendario[] = [];
  diasSeleccionados: string[] = [];
  fechaInicioPlan!: Date;
  fechaFinPlan!: Date;

  constructor(
    private dialogRef: MatDialogRef<ModalCalendarioPautaComponent>,
    private backendMediosService: BackendMediosService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.inicializarFechas();
    this.generarCalendario();
    this.cargarDiasSeleccionados();
  }

  private inicializarFechas(): void {
    const planData = this.data.planData;
    this.fechaInicioPlan = new Date(planData.fechaInicio);
    this.fechaFinPlan = new Date(planData.fechaFin);
  }

  private generarCalendario(): void {
    this.diasCalendario = [];
    const fechaActual = new Date(this.fechaInicioPlan);
    
    while (fechaActual <= this.fechaFinPlan) {
      this.diasCalendario.push({
        fecha: new Date(fechaActual),
        seleccionado: false,
        habilitado: true
      });
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
  }

  private cargarDiasSeleccionados(): void {
    if (this.data.pauta.diasSeleccionados) {
      this.diasSeleccionados = [...this.data.pauta.diasSeleccionados];
      
      this.diasCalendario.forEach(dia => {
        const fechaStr = this.formatearFecha(dia.fecha);
        dia.seleccionado = this.diasSeleccionados.includes(fechaStr);
      });
    }
  }

  toggleDia(dia: DiaCalendario): void {
    if (!dia.habilitado) return;

    dia.seleccionado = !dia.seleccionado;
    const fechaStr = this.formatearFecha(dia.fecha);

    if (dia.seleccionado) {
      if (!this.diasSeleccionados.includes(fechaStr)) {
        this.diasSeleccionados.push(fechaStr);
      }
    } else {
      const index = this.diasSeleccionados.indexOf(fechaStr);
      if (index > -1) {
        this.diasSeleccionados.splice(index, 1);
      }
    }

    this.diasSeleccionados.sort();
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
  }

  obtenerNombreMes(mes: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[mes];
  }

  guardarCalendario(): void {
    const pautaActualizada = {
      ...this.data.pauta,
      diasSeleccionados: this.diasSeleccionados,
      totalDiasSeleccionados: this.diasSeleccionados.length,
      fechaInicio: this.fechaInicioPlan,
      fechaFin: this.fechaFinPlan
    };

    this.actualizarCalendarioEnBackend(pautaActualizada);
    this.dialogRef.close(true);
  }

  private actualizarCalendarioEnBackend(pautaActualizada: RespuestaPauta): void {
    const planMedioItemId = Number(pautaActualizada.id);
    
    if (isNaN(planMedioItemId)) {
      console.error('❌ ID de item inválido para actualizar calendario');
      return;
    }

    const calendarioData = {
      diasSeleccionados: pautaActualizada.diasSeleccionados || [],
      totalDias: pautaActualizada.totalDiasSeleccionados || 0,
      fechaModificacion: new Date().toISOString()
    };

    const request = {
      planMedioItemId: planMedioItemId,
      calendarioJson: JSON.stringify(calendarioData),
      usuarioModifico: 'SYSTEM' // TODO: Usuario real
    };

    console.log('📅 Actualizando calendario en backend:', request);

    this.backendMediosService.actualizarCalendarioJson(request).subscribe({
      next: (response: any) => {
        console.log('✅ Calendario actualizado en backend:', response);
        this.snackBar.open('✅ Calendario guardado exitosamente', '', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        console.error('❌ Error actualizando calendario en backend:', error);
        this.snackBar.open('❌ Error guardando el calendario', '', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
} 

  // Componente Modal para Descargar Plantilla Medio
  @Component({
    selector: 'app-modal-descargar-plantilla-medio',
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
        <h2 mat-dialog-title>
          Descargar Plantilla de Medio
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="modal-header">
          <h3 mat-dialog-title>
            Pais: Mexico 
          </h3>
      </div>
      <mat-dialog-content class="modal-content">
        
        <!-- Formulario Simplificado -->
        <mat-card class="form-card">
          <mat-card-header class="header"> 
            <mat-card-title>Selecciona un Medio</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="medioForm">
              <mat-form-field class="full-width">
                <mat-label>Medios</mat-label>
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
          <mat-icon>download</mat-icon>
          Descargar Plantilla
        </button>
      </mat-dialog-actions>
    `,
    styles: [`
      .header{
        margin-bottom: 16px;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0px;
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
  export class ModalDescargarPlantillaMedioComponent implements OnInit {
    medioForm!: FormGroup;
    mediosDisponibles: MedioBackend[] = []; // Cambiar a array de MedioBackend
    mediosExistentes: any[] = [];
    existeCombinacion: boolean = false;
    paisId: number = 5; // Por defecto 5 semanas
    cargandoMedios: boolean = true;
    cargandoProveedores: boolean = false;

    constructor(
      private fb: FormBuilder,
      private backendMediosService: BackendMediosService,
      private dialogRef: MatDialogRef<ModalDescargarPlantillaMedioComponent>,
      private snackBar: MatSnackBar,
      @Inject(MAT_DIALOG_DATA) public data: any
    ) {
      this.medioForm = this.fb.group({
        medio: ['', [Validators.required]],
      });
    }

    ngOnInit(): void {
      
      this.cargarMediosDesdeBackend();

      this.medioForm.valueChanges.subscribe(() => {
        // this.validarCombinacionDuplicada();
      });
    }

        onMedioChange(medio: MedioBackend): void {
    if (medio && medio.medioId) {
      this.cargandoProveedores = true;
      console.log('🔄 Cargando proveedores para medio:', medio.nombre, 'ID:', medio.medioId);
      this.medioForm.patchValue({ proveedor: '' });
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

    guardarMedio(): void {
      // Marcar todos los campos como tocados para mostrar errores
      this.medioForm.markAllAsTouched();

      // Validar campos obligatorios
      if (this.medioForm.invalid) {
        let mensajeError = 'Por favor completa todos los campos obligatorios:';
        
        if (this.medioForm.get('medio')?.hasError('required')) {
          mensajeError += ' Medio';
        }
       
        this.snackBar.open(`❌ ${mensajeError}`, '', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      const valores = this.medioForm.value;
      const medioSeleccionado = valores.medio as MedioBackend;

      // Preparar request para el backend
      const crearRequest: any = {
        paisId: 5,
        medioId: medioSeleccionado.medioId,
      };

      console.log('📤 Enviando request al backend:', crearRequest);

      // Guardar en el backend
      this.backendMediosService.descargarTemplatePantalla(crearRequest).subscribe(
          (blob: Blob) => {
            // ✅ Crear un enlace para descargar el archivo
            const a = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
            a.download = `Template_${medioSeleccionado.nombre}.xlsx`;
            a.click();
            URL.revokeObjectURL(objectUrl);

            this.snackBar.open('✅ Plantilla descargada correctamente', '', {
              duration: 2000,
              panelClass: ['success-snackbar']
            });

            // Si usas un dialog, puedes cerrarlo aquí si aplica
            this.dialogRef?.close({ shouldRefresh: false });
          },
          (error: any) => {
            console.error('❌ Error al descargar plantilla:', error);
            this.snackBar.open('❌ Error al descargar la plantilla', '', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        );

    }
  }