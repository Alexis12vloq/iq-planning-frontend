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
import { Router } from '@angular/router';
import { PlantillaPautaService } from '../services/plantilla-pauta.service';
import { PlantillaPauta, CampoPlantilla, RespuestaPauta, DiaCalendario } from '../models/plantilla-pauta.model';
import { Inject } from '@angular/core';

interface PlanData {
  id?: string;
  numeroPlan: string;
  version: number;
  cliente: string;
  producto: string;
  campana: string;
  fechaInicio?: string;
  fechaFin?: string;
}

@Component({
  selector: 'app-plan-medios-nueva-pauta',
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
    MatNativeDateModule
  ],
  templateUrl: './plan-medios-nueva-pauta.html',
  styleUrls: ['./plan-medios-nueva-pauta.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanMediosNuevaPauta implements OnInit {
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
  
  // Pautas guardadas
  pautasGuardadas: RespuestaPauta[] = [];
  
  // Medios disponibles
  mediosDisponibles: string[] = ['TV NAL', 'Radio', 'Digital', 'Prensa', 'OOH'];
  
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
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.planData = navigation?.extras?.state?.['planData'] as PlanData;

    if (!this.planData) {
      this.router.navigate(['/plan-medios-resumen']);
      return;
    }

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
  }

  ngOnInit(): void {
    this.cargandoPlantilla = false;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    this.cargarPautasExistentes();
  }

  // Cargar plantilla según el país del plan y el medio seleccionado
    cargarPlantillaPorMedio(medio: string): void {
    this.cargandoPlantilla = true;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    setTimeout(() => {
      try {
        const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const planCompleto = planesLocal.find((plan: any) => plan.id === this.planData?.id);
        const paisFacturacion = planCompleto?.paisFacturacion || 'Perú';

        this.plantillaActual = this.plantillaService.obtenerPlantilla(paisFacturacion, medio);
        
        if (this.plantillaActual) {
          this.generarFormularioSimplificado();
          this.configurarCalculosAutomaticos();
          this.snackBar.open(`Plantilla cargada: ${this.plantillaActual.nombre}`, '', { 
            duration: 1500,
            panelClass: ['success-snackbar']
          });
          this.errorPlantilla = null;
        } else {
          this.errorPlantilla = `No existe plantilla configurada para "${medio}" en ${paisFacturacion}. ` +
                               `Contacta al administrador para configurar esta combinación.`;
          this.pautaForm = this.fb.group({});
        }
      } catch (error) {
        console.error('Error al cargar plantilla:', error);
        this.errorPlantilla = 'Error al cargar la plantilla. Intenta nuevamente.';
        this.plantillaActual = null;
        this.pautaForm = this.fb.group({});
      } finally {
        this.cargandoPlantilla = false;
        this.cdr.detectChanges();
      }
    }, 10);
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

    const formData = this.pautaForm.value;
    
    const nuevaPauta: RespuestaPauta = {
      id: Date.now().toString(),
      planId: this.planData.id || '',
      plantillaId: this.plantillaActual.id,
      paisFacturacion: this.plantillaActual.paisFacturacion,
      medio: this.plantillaActual.medio,
      datos: formData,
      fechaCreacion: new Date().toISOString(),
      valorTotal: parseFloat(formData['valor_total']) || 0,
      valorNeto: parseFloat(formData['valor_neto']) || 0,
      totalSpots: parseInt(formData['total_spots']) || 1,
      semanas: formData['semanas'] || []
    };

    this.guardarPautaEnStorage(nuevaPauta);
    this.pautasGuardadas.push(nuevaPauta);
    this.snackBar.open('Pauta guardada correctamente', '', { duration: 2000 });
    this.pautaForm.reset();
    this.cdr.detectChanges();
  }

  private guardarPautaEnStorage(pauta: RespuestaPauta): void {
    const pautasExistentes = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    pautasExistentes.push(pauta);
    localStorage.setItem('respuestasPautas', JSON.stringify(pautasExistentes));
  }

  eliminarPauta(pautaId: string, index: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta pauta?')) {
      try {
        this.pautasGuardadas.splice(index, 1);
        this.eliminarPautaDeStorage(pautaId);
        this.snackBar.open('Pauta eliminada correctamente', '', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error al eliminar pauta:', error);
        this.snackBar.open('Error al eliminar la pauta', '', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  private eliminarPautaDeStorage(pautaId: string): void {
    const pautasExistentes = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const pautasFiltradas = pautasExistentes.filter((pauta: RespuestaPauta) => pauta.id !== pautaId);
    localStorage.setItem('respuestasPautas', JSON.stringify(pautasFiltradas));
  }

  private cargarPautasExistentes(): void {
    if (!this.planData?.id) {
      this.pautasGuardadas = [];
      return;
    }
    
    try {
      const pautasStorage = localStorage.getItem('respuestasPautas');
      if (!pautasStorage) {
        this.pautasGuardadas = [];
        return;
      }
      
      const todasLasPautas = JSON.parse(pautasStorage);
      this.pautasGuardadas = todasLasPautas.filter((pauta: RespuestaPauta) => 
        pauta.planId === this.planData?.id
      );
    } catch (error) {
      console.error('Error al cargar pautas existentes:', error);
      this.pautasGuardadas = [];
    }
  }

  onCargaExcel(): void {
    this.snackBar.open('Funcionalidad de carga Excel próximamente', '', { duration: 2000 });
  }

  onDescargaExcel(): void {
    this.snackBar.open('Funcionalidad de descarga Excel próximamente', '', { duration: 2000 });
  }

  onRegresar(): void {
    const planDataConId = {
      id: this.planData?.id,
      numeroPlan: this.planData?.numeroPlan,
      version: this.planData?.version,
      cliente: this.planData?.cliente,
      producto: this.planData?.producto,
      campana: this.planData?.campana
    };
    
    this.router.navigate(['/plan-medios-resumen'], {
      state: { planData: planDataConId }
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
        mediosDisponibles: this.mediosDisponibles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarPautasExistentes();
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
      <h2 mat-dialog-title>
        <mat-icon>add_circle</mat-icon>
        Nueva Pauta - Plan {{ data.planData?.numeroPlan }}
      </h2>
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
        <mat-card-header>
          <mat-card-title>Seleccionar Medio</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="seleccionForm">
            <mat-form-field class="full-width">
              <mat-label>Medio</mat-label>
              <mat-select formControlName="medio">
                <mat-option *ngFor="let medio of data.mediosDisponibles" [value]="medio">
                  {{ medio }}
                </mat-option>
              </mat-select>
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
        <mat-card-header>
          <mat-card-title>{{ plantillaActual.nombre }}</mat-card-title>
          <mat-card-subtitle>{{ plantillaActual.descripcion }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="pautaForm">
            <!-- Campos Dinámicos -->
            <div class="form-grid">
              <ng-container *ngFor="let campo of plantillaActual.fields">
                
                <!-- Campo de Input -->
                <mat-form-field *ngIf="esInputField(campo)">
                  <mat-label>{{ campo.label }}</mat-label>
                  <input 
                    matInput 
                    [formControlName]="campo.name"
                    [type]="obtenerTipoCampo(campo)"
                    [step]="campo.type === 'decimal' || campo.type === 'money' ? '0.01' : null">
                </mat-form-field>

                <!-- Campo Select con Opciones Fijas -->
                <mat-form-field *ngIf="esSelectField(campo)">
                  <mat-label>{{ campo.label }}</mat-label>
                  <mat-select [formControlName]="campo.name">
                    <mat-option *ngFor="let opcion of campo.options" [value]="opcion">
                      {{ opcion }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Campo Select con Lookup -->
                <mat-form-field *ngIf="esLookupField(campo)">
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
        Guardar Pauta
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

    .plan-info {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
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

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .full-width {
      width: 100%;
    }

    .loading-container, .error-container {
      text-align: center;
      padding: 40px;
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
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      justify-content: flex-end;
      gap: 12px;
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

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaPautaService,
    private dialogRef: MatDialogRef<ModalNuevaPautaComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.seleccionForm = this.fb.group({
      medio: ['']
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
  }

  ngOnInit(): void {
    this.cargandoPlantilla = false;
    this.errorPlantilla = null;
    this.plantillaActual = null;
  }

  cargarPlantillaPorMedio(medio: string): void {
    this.cargandoPlantilla = true;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    setTimeout(() => {
      try {
        const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const planCompleto = planesLocal.find((plan: any) => plan.id === this.data.planData?.id);
        const paisFacturacion = planCompleto?.paisFacturacion || 'Perú';

        this.plantillaActual = this.plantillaService.obtenerPlantilla(paisFacturacion, medio);
        
        if (this.plantillaActual) {
          this.generarFormulario();
          this.configurarCalculosAutomaticos();
          this.errorPlantilla = null;
        } else {
          this.errorPlantilla = `No existe plantilla configurada para "${medio}" en ${paisFacturacion}`;
          this.pautaForm = this.fb.group({});
        }
      } catch (error) {
        console.error('Error al cargar plantilla:', error);
        this.errorPlantilla = 'Error al cargar la plantilla. Intenta nuevamente.';
        this.plantillaActual = null;
        this.pautaForm = this.fb.group({});
      } finally {
        this.cargandoPlantilla = false;
      }
    }, 10);
  }

  generarFormulario(): void {
    if (!this.plantillaActual) {
      this.pautaForm = this.fb.group({});
      return;
    }

    const formConfig: { [key: string]: any } = {};

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
    if (!this.plantillaActual || !this.pautaForm.valid) {
      return;
    }

    const valores = this.pautaForm.value;
    const pauta: RespuestaPauta = {
      id: Date.now().toString(),
      planId: this.data.planData.id,
      plantillaId: this.plantillaActual.id,
      paisFacturacion: this.plantillaActual.paisFacturacion,
      medio: this.plantillaActual.medio,
      datos: valores,
      fechaCreacion: new Date().toISOString(),
      valorTotal: valores.valor_total || 0,
      valorNeto: valores.valor_neto || 0,
      totalSpots: valores.total_spots || 0,
      diasSeleccionados: [],
      totalDiasSeleccionados: 0
    };

    this.guardarPautaEnStorage(pauta);
    this.dialogRef.close(true);
  }

  private guardarPautaEnStorage(pauta: RespuestaPauta): void {
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    pautas.push(pauta);
    localStorage.setItem('respuestasPautas', JSON.stringify(pautas));
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

    this.actualizarPautaEnStorage(pautaActualizada);
    this.dialogRef.close(true);
  }

  private actualizarPautaEnStorage(pautaActualizada: RespuestaPauta): void {
    const pautas = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    const index = pautas.findIndex((p: RespuestaPauta) => p.id === pautaActualizada.id);
    
    if (index > -1) {
      pautas[index] = pautaActualizada;
      localStorage.setItem('respuestasPautas', JSON.stringify(pautas));
    }
  }
} 