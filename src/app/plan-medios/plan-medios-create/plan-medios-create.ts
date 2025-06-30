import { Component, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { CommonModule } from '@angular/common';
// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanMediosLocal } from '../models/plan-medios-local.model';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-plan-medios-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './plan-medios-create.html',
  styleUrls: ['./plan-medios-create.scss']
})
export class PlanMediosCreate implements AfterViewInit {
  // Opciones fijas
  paises: string[] = ['Perú', 'Colombia', 'Argentina', 'Chile', 'México'];
  tiposCompra: string[] = ['Directo', 'Programático', 'RTB'];

  // Simulación de respuesta del backend (estructura anidada)
  clientesBackend = [
    {
      nombre: 'Coca-Cola',
      clientesFacturacion: [
        {
          nombre: 'Coca-Cola Perú',
          marcas: [
            {
              nombre: 'Coca-Cola',
              productos: ['Coca-Cola Original', 'Coca-Cola Zero', 'Coca-Cola Light']
            },
            {
              nombre: 'Fanta',
              productos: ['Fanta Naranja', 'Fanta Uva']
            }
          ]
        },
        {
          nombre: 'Coca-Cola México',
          marcas: [
            {
              nombre: 'Sprite',
              productos: ['Sprite Regular', 'Sprite Sin Azúcar']
            }
          ]
        }
      ]
    },
    {
      nombre: 'Nestlé',
      clientesFacturacion: [
        {
          nombre: 'Nestlé Chile',
          marcas: [
            {
              nombre: 'Nescafé',
              productos: ['Nescafé Tradición', 'Nescafé Gold']
            },
            {
              nombre: 'Milo',
              productos: ['Milo Polvo', 'Milo Bebida']
            }
          ]
        }
      ]
    },
    {
      nombre: 'Unilever',
      clientesFacturacion: [
        {
          nombre: 'Unilever Argentina',
          marcas: [
            {
              nombre: 'Axe',
              productos: ['Axe Dark Temptation', 'Axe Apollo']
            },
            {
              nombre: 'Rexona',
              productos: ['Rexona Men', 'Rexona Women']
            }
          ]
        },
        {
          nombre: 'Unilever Colombia',
          marcas: [
            {
              nombre: 'Sedal',
              productos: ['Sedal Rizos', 'Sedal Liso']
            }
          ]
        }
      ]
    }
  ];

  // Opciones dinámicas dependientes
  clientesFacturacionOptions: string[] = [];
  marcasOptions: string[] = [];
  productosOptions: string[] = [];

  // Formulario reactivo
  planMediosForm = new FormGroup({
    numeroPlan: new FormControl({ value: 'Auto', disabled: true }, Validators.required),
    version: new FormControl({ value: '1', disabled: true }, [Validators.required]),
    paisFacturacion: new FormControl('', Validators.required),
    paisesPauta: new FormControl<string[]>([], [Validators.required, Validators.minLength(1)]),
    clienteAnunciante: new FormControl('', Validators.required),
    clienteFueActuacion: new FormControl('', Validators.required),
    marca: new FormControl('', Validators.required),
    producto: new FormControl('', Validators.required),
    campana: new FormControl('', Validators.required),
    fechaInicio: new FormControl('', Validators.required),
    fechaFin: new FormControl('', Validators.required),
    estado: new FormControl(false, Validators.required)
  });

  // Observables para autocompletes
  filteredPaisesFacturacion!: Observable<string[]>;
  filteredClientes!: Observable<string[]>;
  filteredClientesActuacion!: Observable<string[]>;
  filteredMarcas!: Observable<string[]>;
  filteredProductos!: Observable<string[]>;

  minFechaInicio = new Date();
  minFechaFin: Date | null = null;

  // Modo edición
  editMode = false;
  editId: string | null = null;

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // 1. Autocomplete: País Facturación
    this.filteredPaisesFacturacion = this.planMediosForm.get('paisFacturacion')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.paises))
    );

    // 2. Autocomplete: Cliente / Anunciante
    this.filteredClientes = this.planMediosForm.get('clienteAnunciante')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.clientesBackend.map(c => c.nombre)))
    );

    // 3. Cuando cambia cliente anunciante, actualizar clientes de facturación y limpiar dependientes
    this.planMediosForm.get('clienteAnunciante')!.valueChanges.subscribe((cliente: string | null) => {
      const clienteObj = this.clientesBackend.find(c => c.nombre === cliente);
      this.clientesFacturacionOptions = clienteObj ? clienteObj.clientesFacturacion.map(cf => cf.nombre) : [];
      this.marcasOptions = [];
      this.productosOptions = [];
      this.planMediosForm.get('clienteFueActuacion')!.setValue('');
      this.planMediosForm.get('marca')!.setValue('');
      this.planMediosForm.get('producto')!.setValue('');
    });

    // 4. Autocomplete: Cliente Facturación (dependiente de cliente anunciante)
    this.filteredClientesActuacion = this.planMediosForm.get('clienteFueActuacion')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.clientesFacturacionOptions))
    );

    // 5. Cuando cambia cliente de facturación, actualizar marcas y limpiar dependientes
    this.planMediosForm.get('clienteFueActuacion')!.valueChanges.subscribe((facturacion: string | null) => {
      const clienteObj = this.clientesBackend.find(c => c.nombre === this.planMediosForm.get('clienteAnunciante')!.value);
      const facturacionObj = clienteObj?.clientesFacturacion.find(cf => cf.nombre === facturacion);
      this.marcasOptions = facturacionObj ? facturacionObj.marcas.map(m => m.nombre) : [];
      this.productosOptions = [];
      this.planMediosForm.get('marca')!.setValue('');
      this.planMediosForm.get('producto')!.setValue('');
    });

    // 6. Autocomplete: Marca (dependiente de cliente de facturación)
    this.filteredMarcas = this.planMediosForm.get('marca')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.marcasOptions))
    );

    // 7. Cuando cambia marca, actualizar productos
    this.planMediosForm.get('marca')!.valueChanges.subscribe((marca: string | null) => {
      const clienteObj = this.clientesBackend.find(c => c.nombre === this.planMediosForm.get('clienteAnunciante')!.value);
      const facturacionObj = clienteObj?.clientesFacturacion.find(cf => cf.nombre === this.planMediosForm.get('clienteFueActuacion')!.value);
      const marcaObj = facturacionObj?.marcas.find(m => m.nombre === marca);
      this.productosOptions = marcaObj ? marcaObj.productos : [];
      this.planMediosForm.get('producto')!.setValue('');
    });

    // 8. Autocomplete: Producto (dependiente de marca)
    this.filteredProductos = this.planMediosForm.get('producto')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.productosOptions))
    );

    // 9. Restricción de fechas
    this.planMediosForm.get('fechaInicio')!.valueChanges.subscribe((fechaInicioRaw: any) => {
      let fechaInicio: Date | null = null;

      // Verifica si la fecha de inicio es válida
      if (fechaInicioRaw && typeof fechaInicioRaw === 'object' && typeof (fechaInicioRaw as Date).getTime === 'function') {
        fechaInicio = fechaInicioRaw as Date;
      } else if (typeof fechaInicioRaw === 'string' && fechaInicioRaw) {
        const parsed = new Date(Date.parse(fechaInicioRaw));
        if (!isNaN(parsed.getTime())) {
          fechaInicio = parsed;
        }
      }

      if (fechaInicio) {
        this.minFechaFin = fechaInicio; // Establece la fecha mínima para fechaFin
        const fechaFinRaw = this.planMediosForm.get('fechaFin')!.value;
        let fechaFin: Date | null = null;

        // Verifica si la fecha de fin es válida
        if (fechaFinRaw && typeof fechaFinRaw === 'object' && typeof (fechaFinRaw as Date).getTime === 'function') {
          fechaFin = fechaFinRaw as Date;
        } else if (typeof fechaFinRaw === 'string' && fechaFinRaw) {
          const parsedFin = new Date(Date.parse(fechaFinRaw));
          if (!isNaN(parsedFin.getTime())) {
            fechaFin = parsedFin;
          }
        }

        // Si la fecha de fin es anterior a la fecha de inicio, resetea el campo
        if (!fechaFin || (fechaFin instanceof Date && fechaFin < fechaInicio)) {
          this.planMediosForm.get('fechaFin')!.setValue(''); // Resetea el valor pero no deshabilita
        }
      } else {
        this.minFechaFin = null; // Resetea la fecha mínima si no hay fecha de inicio válida
        this.planMediosForm.get('fechaFin')!.setValue(''); // Resetea el valor pero no deshabilita
      }

      // Asegúrate de que el control esté habilitado
      this.planMediosForm.get('fechaFin')!.enable();
      this.planMediosForm.get('fechaFin')!.updateValueAndValidity(); // Actualiza el estado del control
    });

    // --- Lógica de edición ---
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editMode = true;
        this.editId = id;
        const planesGuardados: PlanMediosLocal[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const plan = planesGuardados.find(p => p.id === id);
        if (plan) {
          // --- Lógica para poblar selects dependientes en edición ---
          // 1. Actualiza clientesFacturacionOptions según clienteAnunciante
          const clienteObj = this.clientesBackend.find(c => c.nombre === plan.clienteAnunciante);
          this.clientesFacturacionOptions = clienteObj ? clienteObj.clientesFacturacion.map(cf => cf.nombre) : [];

          // 2. Actualiza marcasOptions según clienteFueActuacion
          const facturacionObj = clienteObj?.clientesFacturacion.find(cf => cf.nombre === plan.clienteFueActuacion);
          this.marcasOptions = facturacionObj ? facturacionObj.marcas.map(m => m.nombre) : [];

          // 3. Actualiza productosOptions según marca
          const marcaObj = facturacionObj?.marcas.find(m => m.nombre === plan.marca);
          this.productosOptions = marcaObj ? marcaObj.productos : [];

          // Ahora sí, setea los valores del formulario (asegúrate de hacerlo después de poblar las opciones)
          setTimeout(() => {
            this.planMediosForm.patchValue({
              numeroPlan: plan.numeroPlan,
              version: plan.version,
              paisFacturacion: plan.paisFacturacion,
              paisesPauta: plan.paisesPauta,
              clienteAnunciante: plan.clienteAnunciante,
              clienteFueActuacion: plan.clienteFueActuacion,
              marca: plan.marca,
              producto: plan.producto,
              campana: plan.campana,
              fechaInicio: plan.fechaInicio,
              fechaFin: plan.fechaFin,
              estado: plan.estado
            });
          });

          // Deshabilita campos no editables en modo edición
          this.planMediosForm.get('numeroPlan')?.disable();
          this.planMediosForm.get('version')?.disable();
          this.planMediosForm.get('paisFacturacion')?.disable();
          this.planMediosForm.get('clienteAnunciante')?.disable();
          this.planMediosForm.get('clienteFueActuacion')?.disable();
          this.planMediosForm.get('marca')?.disable();
          this.planMediosForm.get('producto')?.disable();
          // Habilita solo los campos editables
          this.planMediosForm.get('paisesPauta')?.enable();
          this.planMediosForm.get('campana')?.enable();
          this.planMediosForm.get('fechaInicio')?.enable();
          this.planMediosForm.get('fechaFin')?.enable();
        }
      } else {
        // En modo creación, asegúrate de que todos los campos estén habilitados según corresponda
        this.planMediosForm.get('numeroPlan')?.disable();
        this.planMediosForm.get('version')?.disable();
        this.planMediosForm.get('paisFacturacion')?.enable();
        this.planMediosForm.get('clienteAnunciante')?.enable();
        this.planMediosForm.get('clienteFueActuacion')?.enable();
        this.planMediosForm.get('marca')?.enable();
        this.planMediosForm.get('producto')?.enable();
        this.planMediosForm.get('paisesPauta')?.enable();
        this.planMediosForm.get('campana')?.enable();
        this.planMediosForm.get('fechaInicio')?.enable();
        this.planMediosForm.get('fechaFin')?.enable();
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.planMediosForm.get('fechaInicio')!.updateValueAndValidity();
      this.planMediosForm.get('fechaFin')!.updateValueAndValidity();
    });
  }

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }

  onSubmit() {
    if (this.planMediosForm.valid) {
      this.snackBar.open(this.editMode ? 'Actualizando plan de medios...' : 'Creando plan de medios...', '', { duration: 1200 });

      const planesGuardados: PlanMediosLocal[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      let lastNumeroPlan = 1000;
      if (!this.editMode && planesGuardados.length > 0) {
        const max = Math.max(
          ...planesGuardados
            .map(p => parseInt(p.numeroPlan, 10))
            .filter(n => !isNaN(n))
        );
        if (!isNaN(max) && max >= 1000) lastNumeroPlan = max + 1;
      }

      const formValue = this.planMediosForm.getRawValue();

      // Formatea fechas a 'YYYY-MM-DD'
      const formatDate = (date: any) => {
        if (!date) return '';
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
      };

      if (this.editMode && this.editId) {
        // --- Modo edición: actualiza el plan existente ---
        const idx = planesGuardados.findIndex(p => p.id === this.editId);
        if (idx !== -1) {
          planesGuardados[idx] = {
            ...planesGuardados[idx],
            // Solo actualiza los campos editables, mantiene id, numeroPlan y version
            paisFacturacion: formValue.paisFacturacion ?? '',
            paisesPauta: formValue.paisesPauta ?? [],
            clienteAnunciante: formValue.clienteAnunciante ?? '',
            clienteFueActuacion: formValue.clienteFueActuacion ?? '',
            marca: formValue.marca ?? '',
            producto: formValue.producto ?? '',
            campana: formValue.campana ?? '',
            fechaInicio: formatDate(formValue.fechaInicio),
            fechaFin: formatDate(formValue.fechaFin),
            estado: formValue.estado ?? false
          };
          localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        }
        setTimeout(() => {
          this.snackBar.open('Plan de medios actualizado correctamente', '', { duration: 2000 });
          this.router.navigate(['/plan-medios-consulta']);
        }, 1200);
      } else {
        // --- Modo creación ---
        const nuevoPlan: PlanMediosLocal = {
          id: Date.now().toString(),
          numeroPlan: lastNumeroPlan.toString(),
          version: formValue.version ?? '',
          paisFacturacion: formValue.paisFacturacion ?? '',
          paisesPauta: formValue.paisesPauta ?? [],
          clienteAnunciante: formValue.clienteAnunciante ?? '',
          clienteFueActuacion: formValue.clienteFueActuacion ?? '',
          marca: formValue.marca ?? '',
          producto: formValue.producto ?? '',
          campana: formValue.campana ?? '',
          fechaInicio: formatDate(formValue.fechaInicio),
          fechaFin: formatDate(formValue.fechaFin),
          estado: false 
        };

        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));

        setTimeout(() => {
          this.snackBar.open('Plan de medios creado correctamente', '', { duration: 2000 });
          this.router.navigate(['/plan-medios-consulta']);
        }, 1200);
      }
    } else {
      console.log('Formulario inválido:', this.planMediosForm.errors, this.planMediosForm.status, this.planMediosForm.value);
      Object.keys(this.planMediosForm.controls).forEach(key => {
        const control = this.planMediosForm.get(key);
        console.log(
          `Control "${key}": value=`, control?.value,
          'valid=', control?.valid,
          'errors=', control?.errors
        );
      });
    }
  }

  cancelar() {
    this.router.navigate(['/plan-medios-consulta']);
  }
}
