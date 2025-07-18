import { Component, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, startWith, map, retry, catchError, of } from 'rxjs';
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
import { PlanMediosService } from '../services/plan-medios.service';
import { TablaParametrosService } from '../services/table-parametros'; // Asegúrate de tener este servicio

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
  paises: string[] = [];
  tiposCompra: string[] = [];
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
  // Modo edición
  editMode = false;
  copyMode = false;
  editId: string | null = null;
  // NUEVO: Parámetros dinámicos
  tablaParametros: any[] = [];

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private planMediosService: PlanMediosService,
    private tablaParametrosService: TablaParametrosService // Inyecta el servicio real
  ) {
    // Llama al servicio real y luego inicializa la lógica del formulario
    this.tablaParametrosService.getAll().subscribe(parametros => {
      this.tablaParametros = parametros;
      console.log(parametros);
      this.mapearParametros();
      this.initFormLogic();
    });
  }

  // NUEVO: Mapea los parámetros a las estructuras usadas en el formulario
  mapearParametros() {
    // Paises
    this.paises = this.tablaParametros
      .filter(p => p.tabla === 'Paises' && p.campo_Est)
      .map(p => p.campo_Val);

    // Tipos de compra
    this.tiposCompra = this.tablaParametros
      .filter(p => p.tabla === 'TipoCompra' && p.campo_Est)
      .map(p => p.campo_Val);

    // Clientes y estructura anidada
    const clientesAnunciante = this.tablaParametros.filter(p => p.tabla === 'ClientesAnunciante' && p.campo_Est);
    const clientesFacturacion = this.tablaParametros.filter(p => p.tabla === 'ClientesFacturacion' && p.campo_Est);
    const marcas = this.tablaParametros.filter(p => p.tabla === 'Marcas' && p.campo_Est);
    const productos = this.tablaParametros.filter(p => p.tabla === 'Productos' && p.campo_Est);

    this.clientesBackend = clientesAnunciante.map(ca => ({
      nombre: ca.campo_Val,
      clientesFacturacion: clientesFacturacion
        .filter(cf => cf.campo_Padre_Id === ca.campo_Id)
        .map(cf => ({
          nombre: cf.campo_Val,
          marcas: marcas
            .filter(m => m.campo_Padre_Id === cf.campo_Id)
            .map(m => ({
              nombre: m.campo_Val,
              productos: productos
                .filter(p => p.campo_Padre_Id === m.campo_Id)
                .map(p => p.campo_Val)
            }))
        }))
    }));
  }
  obtenerNombresPaises(idsPaises: string): string[] {
    console.log(`IDs de países: ${idsPaises}`);
    if (!idsPaises) return [];

    return idsPaises
      .split(',')                          
      .map(id => Number(id.trim()))          
      .map(id => this.tablaParametros.find(p => p.campo_Id === id)?.campo_Val)
      .filter((val): val is string => !!val); 
  }

  // NUEVO: Inicializa la lógica del formulario (lo que estaba en el constructor)
  initFormLogic() {
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
    let pathActual = '';

    this.route.url.subscribe(segments => {
    pathActual = segments.map(s => s.path).join('/');
    
    if (pathActual.includes('plan-medios-copiar')) {
      this.copyMode = true;
    } else if (pathActual.includes('plan-medios-editar')) {
      this.editMode = true;
    }
  });

    // --- Lógica de edición ---
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editId = id;
        this.planMediosService.consultarPlanDeMedios(Number(id))
        .pipe(
          retry(2), // Reintentar 2 veces en caso de error
          catchError((error) => {
            return of([]);
          })
        )
        .subscribe({
          next: (response: any) => {
            // Convertir los datos del backend al formato local
            console.log(response)
            const planesGuardados: PlanMediosLocal[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const plan = response;
        if (plan) {
          // --- Lógica para poblar selects dependientes en edición ---
          // 1. Actualiza clientesFacturacionOptions según clienteAnunciante
          console.log(this.clientesBackend);
          const clienteObj = this.clientesBackend.find(c => c.nombre === plan.clienteAnunciante);
          this.clientesFacturacionOptions = clienteObj ? clienteObj.clientesFacturacion.map(cf => cf.nombre) : [];

          // 2. Actualiza marcasOptions según clienteFueActuacion
          const facturacionObj = clienteObj?.clientesFacturacion.find(cf => cf.nombre === plan.clienteFueActuacion);
          this.marcasOptions = facturacionObj ? facturacionObj.marcas.map(m => m.nombre) : [];

          // 3. Actualiza productosOptions según marca
          const marcaObj = facturacionObj?.marcas.find(m => m.nombre === plan.marca);
          this.productosOptions = marcaObj ? marcaObj.productos : [];

          console.log(this.obtenerNombresPaises(plan.idsPaisesPauta))
          const getValue = (tabla: string, value: string, parentId?: number) => {
            console.log(`Buscando ID en tabla: ${tabla}, valor: ${value}, parentId: ${parentId}`);
            if (!value) return null;
            const found = this.tablaParametros.find(
              p => p.tabla === tabla && p.campo_Id === value
            );
            return found ? found.campo_Val : null;
          };
          // Ahora sí, setea los valores del formulario (asegúrate de hacerlo después de poblar las opciones)
          setTimeout(() => {
            this.planMediosForm.patchValue({
              numeroPlan: this.copyMode ? 'AUTO' : plan.numeroPlan,
              version: plan.version,
              paisFacturacion: getValue('Paises', plan.idPaisFacturacion),
              paisesPauta: this.obtenerNombresPaises(plan.paisesPauta),
              clienteAnunciante: getValue('ClientesAnunciante', plan.idClienteAnunciante),
              clienteFueActuacion: getValue('ClientesFacturacion', plan.idClienteFacturacion),
              marca: getValue('Marcas', plan.idMarca),
              producto: getValue('Productos', plan.idProducto),
              campana: plan.campania,
              fechaInicio: plan.fechaInicio,
              fechaFin: plan.fechaFin
            });
          });

            if (this.editMode) {
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

            if (this.copyMode) {
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
        }
          },
          error: (error) => {
            console.error('Error no manejado:', error);
          }
        });
        
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

      const formValue = this.planMediosForm.getRawValue();

      // Helper para asegurar string, nunca null
      const safe = (v: string | null) => v ?? '';

      // Busca los IDs reales usando el campo_Id de la data de tablaParametros
      const getId = (tabla: string, value: string, parentId?: number) => {
        console.log(`Buscando ID en tabla: ${tabla}, valor: ${value}, parentId: ${parentId}`);
        if (!value) return null;
        if (parentId !== undefined) {
          const found = this.tablaParametros.find(
            p => p.tabla === tabla && p.campo_Val === value && p.campo_Padre_Id === parentId
          );
          console.log(found)
          return found ? found.campo_Id : null;
        }
        const found = this.tablaParametros.find(
          p => p.tabla === tabla && p.campo_Val === value
        );
        return found ? found.campo_Id : null;
      };

       

      // IDs principales (campo_Id)
      const idPaisFacturacion = getId('Paises', safe(formValue.paisFacturacion));
      const idClienteAnunciante = getId('ClientesAnunciante', safe(formValue.clienteAnunciante));
      const idClienteFacturacion = getId('ClientesFacturacion', safe(formValue.clienteFueActuacion), idClienteAnunciante);
      const idMarca = getId('Marcas', safe(formValue.marca), idClienteFacturacion);
      const idProducto = getId('Productos', safe(formValue.producto), idMarca);
      console.log(idClienteAnunciante)
      // IDs de países de pauta (array de campo_Id)
      const idsPaisesPauta = (formValue.paisesPauta || []).map((pais: string | null) =>
        getId('Paises', safe(pais))
      ).filter((id: number | null) => id !== null);

      // Construye el body para el backend con NumeroPlan
      let lastNumeroPlan = 1000;
      
      // Construye el body SOLO con los campo_Id
      const body = {
        NumeroPlan: lastNumeroPlan.toString(),
        IdPaisFacturacion: idPaisFacturacion,
        PaisesPauta: idsPaisesPauta.join(','),
        IdClienteAnunciante: idClienteAnunciante,
        IdClienteFacturacion: idClienteFacturacion,
        IdMarca: idMarca,
        IdProducto: idProducto,
        Campania: safe(formValue.campana),
        FechaInicio: formValue.fechaInicio,
        FechaFin: formValue.fechaFin,
        IdUsuarioCreador: 0 // Ajusta según tu lógica de usuario
      };

      // --- Modo edición: primero actualiza en localStorage ---
      if (this.editMode && this.editId) {
        // Luego manda la solicitud al backend

        const bodyUpdate = {
            idPlan: Number(this.editId),
            PaisesPauta: idsPaisesPauta.join(','),
            Campania: safe(formValue.campana),
            FechaInicio: formValue.fechaInicio,
            FechaFin: formValue.fechaFin,
            IdUsuarioCreador: 0 // Ajusta según tu lógica de usuario
        };
        this.planMediosService.updatePlanMedios(bodyUpdate).subscribe({
          next: (resp) => {
            this.snackBar.open('Plan de medios actualizado correctamente', '', { duration: 2000 });
            this.router.navigate(['/plan-medios-consulta']);
          },
          error: (err) => {
            this.snackBar.open('Error al actualizar el plan de medios en backend', '', { duration: 3000 });
          }
        });
      } else {
        console.log("copia",formValue);
        // Luego manda la solicitud al backend
        this.planMediosService.crearPlanMedios(body).subscribe({
          next: (resp) => {
            this.snackBar.open('Plan de medios creado correctamente', '', { duration: 2000 });
            this.router.navigate(['/plan-medios-consulta']);
          },
          error: (err) => {
            this.snackBar.open('Error al crear el plan de medios en backend', '', { duration: 3000 });
          }
        });
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
 


