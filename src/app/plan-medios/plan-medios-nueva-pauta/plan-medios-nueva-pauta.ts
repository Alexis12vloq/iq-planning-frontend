import { Component, OnInit } from '@angular/core';
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
import { Router } from '@angular/router';
import { PlantillaPautaService } from '../services/plantilla-pauta.service';
import { PlantillaPauta, CampoPlantilla, RespuestaPauta } from '../models/plantilla-pauta.model';

interface PlanData {
  id?: string;
  numeroPlan: string;
  version: number;
  cliente: string;
  producto: string;
  campana: string;
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
    MatProgressSpinnerModule
  ],
  templateUrl: './plan-medios-nueva-pauta.html',
  styleUrls: ['./plan-medios-nueva-pauta.scss']
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
    private plantillaService: PlantillaPautaService
  ) {
    // Obtener datos del plan desde el estado de navegación
    const navigation = this.router.getCurrentNavigation();
    this.planData = navigation?.extras?.state?.['planData'] as PlanData;

    if (!this.planData) {
      this.router.navigate(['/plan-medios-resumen']);
      return;
    }

    // Inicializar formulario de selección
    this.seleccionForm = this.fb.group({
      medio: ['', Validators.required]
    });

    // Observar cambios en el medio seleccionado (optimizado)
    this.seleccionForm.get('medio')?.valueChanges.subscribe(medio => {
      if (medio && medio.trim()) {
        this.cargarPlantillaPorMedio(medio);
      } else {
        // Limpiar formulario si no hay medio seleccionado
        this.plantillaActual = null;
        this.errorPlantilla = null;
        this.cargandoPlantilla = false;
        this.pautaForm = this.fb.group({});
      }
    });
  }

  ngOnInit(): void {
    // Limpiar estados iniciales
    this.cargandoPlantilla = false;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    this.cargarPautasExistentes();
  }

  // Cargar plantilla según el país del plan y el medio seleccionado
  cargarPlantillaPorMedio(medio: string): void {
    // Limpiar estados anteriores
    this.cargandoPlantilla = true;
    this.errorPlantilla = null;
    this.plantillaActual = null;
    
    // Usar setTimeout mínimo para mostrar loading
    setTimeout(() => {
      try {
        // Obtener país de facturación del plan
        const planesLocal = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const planCompleto = planesLocal.find((plan: any) => plan.id === this.planData?.id);
        const paisFacturacion = planCompleto?.paisFacturacion || 'Perú';

        // Buscar plantilla
        this.plantillaActual = this.plantillaService.obtenerPlantilla(paisFacturacion, medio);
        
        if (this.plantillaActual) {
          // Generar formulario simplificado
          this.generarFormularioSimplificado();
          this.snackBar.open(`Plantilla cargada: ${this.plantillaActual.nombre}`, '', { 
            duration: 1500,
            panelClass: ['success-snackbar']
          });
          this.errorPlantilla = null;
        } else {
          // No se encontró plantilla
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
      }
    }, 50); // Delay mínimo solo para mostrar loading
  }

  // Generar formulario simplificado sin validadores (máxima velocidad)
  generarFormularioSimplificado(): void {
    if (!this.plantillaActual) {
      this.pautaForm = this.fb.group({});
      return;
    }

    // Configuración básica sin validadores
    const formConfig: { [key: string]: any } = {
      // Campo de semanas básico
      semanas: [[]]
    };

    // Agregar campos de la plantilla sin validadores
    for (const campo of this.plantillaActual.fields) {
      formConfig[campo.name] = [campo.defaultValue || ''];
    }

    // Crear formulario de una vez
    this.pautaForm = this.fb.group(formConfig);
  }

  // Obtener opciones para campos de lookup
  obtenerOpcionesLookup(campo: CampoPlantilla): any[] {
    if (campo.lookupTable) {
      return this.plantillaService.obtenerDatosLookup(campo.lookupTable, campo.lookupCategory);
    }
    return [];
  }

  // Guardar pauta
  onSubmit(): void {
    if (!this.plantillaActual || !this.planData) {
      this.snackBar.open('Error: No hay plantilla o datos del plan', '', { duration: 3000 });
      return;
    }

    const formData = this.pautaForm.value;
    
    // Crear respuesta de pauta
    const nuevaPauta: RespuestaPauta = {
      id: Date.now().toString(),
      planId: this.planData.id || '',
      plantillaId: this.plantillaActual.id,
      paisFacturacion: this.plantillaActual.paisFacturacion,
      medio: this.plantillaActual.medio,
      datos: formData,
      fechaCreacion: new Date().toISOString(),
      // Campos calculados (extraer de los datos del formulario)
      valorTotal: formData['valor_total'] || formData['valorTotal'] || 0,
      valorNeto: formData['valor_neto'] || formData['valorNeto'] || 0,
      totalSpots: formData['total_spots'] || formData['totalSpots'] || 0,
      semanas: formData['semanas'] || []
    };

    // Guardar en localStorage
    this.guardarPautaEnStorage(nuevaPauta);
    
    // Agregar a la lista local
    this.pautasGuardadas.push(nuevaPauta);
    
    // Mostrar mensaje de éxito
    this.snackBar.open('Pauta guardada correctamente', '', { duration: 2000 });
    
    // Limpiar formulario
    this.pautaForm.reset();
  }

  // Guardar pauta en localStorage
  private guardarPautaEnStorage(pauta: RespuestaPauta): void {
    const pautasExistentes = JSON.parse(localStorage.getItem('respuestasPautas') || '[]');
    pautasExistentes.push(pauta);
    localStorage.setItem('respuestasPautas', JSON.stringify(pautasExistentes));
  }

  // Cargar pautas existentes del plan (optimizado)
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

  // Otros métodos
  onCargaExcel(): void {
    this.snackBar.open('Funcionalidad de carga Excel próximamente', '', { duration: 2000 });
  }

  onDescargaExcel(): void {
    this.snackBar.open('Funcionalidad de descarga Excel próximamente', '', { duration: 2000 });
  }

  onRegresar(): void {
    this.router.navigate(['/plan-medios-resumen'], {
      state: { planData: this.planData }
    });
  }

  // Helpers para el template
  // TrackBy function para optimizar renderizado de campos
  trackByCampo(index: number, campo: any): string {
    return campo.name || index.toString();
  }

  // TrackBy function para optimizar renderizado de pautas
  trackByPauta(index: number, pauta: RespuestaPauta): string {
    return pauta.id || index.toString();
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

  // Manejar selección de semanas
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

  // Obtener campos principales para mostrar en la lista
  getMainFields(datos: any): string[] {
    const camposPrincipales = ['IdProveedor', 'IdVehiculo', 'hora', 'franja', 'valor_neto', 'total_spots'];
    return Object.keys(datos).filter(key => 
      camposPrincipales.some(campo => key.toLowerCase().includes(campo.toLowerCase()))
    ).slice(0, 6); // Máximo 6 campos
  }

  // Obtener etiqueta amigable para un campo
  getFieldLabel(fieldName: string): string {
    if (!this.plantillaActual) return fieldName;
    
    const campo = this.plantillaActual.fields.find(f => f.name === fieldName);
    return campo ? campo.label : fieldName;
  }

  // Formatear valor de campo para mostrar
  formatFieldValue(value: any, fieldName: string): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (!this.plantillaActual) return value.toString();
    
    const campo = this.plantillaActual.fields.find(f => f.name === fieldName);
    if (!campo) return value.toString();

    // Formatear según el tipo de campo
    switch (campo.type) {
      case 'money':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      
      case 'decimal':
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(value);
      
      case 'integer':
        return new Intl.NumberFormat('en-US').format(value);
      
      // Para campos lookup, mostrar el valor descriptivo
      default:
        if (campo.lookupTable) {
          const opciones = this.obtenerOpcionesLookup(campo);
          const opcion = opciones.find(o => o.codigo == value);
          return opcion ? opcion.valor : value.toString();
        }
        return value.toString();
    }
  }
} 