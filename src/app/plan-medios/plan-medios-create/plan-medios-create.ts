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
    paisesPauta: new FormControl([], [Validators.required, Validators.minLength(1)]),
    clienteAnunciante: new FormControl('', Validators.required),
    clienteFueActuacion: new FormControl('', Validators.required),
    marca: new FormControl('', Validators.required),
    producto: new FormControl('', Validators.required),
    campana: new FormControl('', Validators.required),
    fechaInicio: new FormControl('', Validators.required),
    fechaFin: new FormControl('', Validators.required)
  });

  // Observables para autocompletes
  filteredPaisesFacturacion!: Observable<string[]>;
  filteredClientes!: Observable<string[]>;
  filteredClientesActuacion!: Observable<string[]>;
  filteredMarcas!: Observable<string[]>;
  filteredProductos!: Observable<string[]>;

  minFechaInicio = new Date();
  minFechaFin: Date | null = null;

  constructor(
    private snackBar: MatSnackBar
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
      if (fechaInicioRaw && typeof fechaInicioRaw === 'object' && typeof (fechaInicioRaw as Date).getTime === 'function') {
        fechaInicio = fechaInicioRaw as Date;
      } else if (typeof fechaInicioRaw === 'string' && fechaInicioRaw) {
        const parsed = new Date(Date.parse(fechaInicioRaw));
        if (!isNaN(parsed.getTime())) {
          fechaInicio = parsed;
        }
      }
      if (fechaInicio) {
        this.minFechaFin = fechaInicio;
        const fechaFinRaw = this.planMediosForm.get('fechaFin')!.value;
        let fechaFin: Date | null = null;
        if (fechaFinRaw && typeof fechaFinRaw === 'object' && typeof (fechaFinRaw as Date).getTime === 'function') {
          fechaFin = fechaFinRaw as Date;
        } else if (typeof fechaFinRaw === 'string' && fechaFinRaw) {
          const parsedFin = new Date(Date.parse(fechaFinRaw));
          if (!isNaN(parsedFin.getTime())) {
            fechaFin = parsedFin;
          }
        }
        if (!fechaFin || (fechaFin instanceof Date && fechaFin < fechaInicio)) {
          this.planMediosForm.get('fechaFin')!.setValue('');
        }
      } else {
        this.minFechaFin = null;
        this.planMediosForm.get('fechaFin')!.setValue('');
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
      this.snackBar.open('Creando plan de medios...', '', { duration: 1200 });

      const planesGuardados: PlanMediosLocal[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      let lastNumeroPlan = 1000;
      if (planesGuardados.length > 0) {
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
        fechaFin: formatDate(formValue.fechaFin)
      };

      planesGuardados.push(nuevoPlan);
      localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));

      setTimeout(() => {
        this.snackBar.open('Plan de medios creado correctamente', '', { duration: 2000 });
        // Opcional: limpiar el formulario o redirigir
      }, 1200);
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
}
