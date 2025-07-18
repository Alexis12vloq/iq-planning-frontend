import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable, startWith, map, retry, catchError, of, BehaviorSubject, combineLatest } from 'rxjs';
import { PlanMediosLocal } from '../models/plan-medios-local.model';
import { PlanMediosService } from '../services/plan-medios.service';
import { PlanMediosQuery, PlanMediosFilter, PlanMediosListDto, TablaParametro, ParametroFiltro, PlanMediosConDetalles } from '../models/plan-medios-dto.model';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

type Resultado = {
  id: string;
  numeroPlan: string;
  version: string;
  pais: string;
  anunciante: string;
  cliente: string;
  marca: string;
  producto: string;
  fechaInicio: string;
  fechaFin: string;
  campania: string;
  fechaCreacion: string;
  estado: string;
  // IDs para filtros
  idPaisFacturacion: number;
  idClienteAnunciante: number;
  idClienteFacturacion: number;
  idMarca: number;
  idProducto: number;
  idEstadoRegistro: number;
  [key: string]: string | boolean | number; // <-- permite acceso dinámico por string
};

@Component({
  selector: 'app-plan-medios-consulta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './plan-medios-consulta.html',
  styleUrls: ['./plan-medios-consulta.scss']
})
export class PlanMediosConsulta implements OnInit, AfterViewInit {
  // Datos del backend
  anunciantesBackend: ParametroFiltro[] = [];
  clientesBackend: ParametroFiltro[] = [];
  marcasBackend: ParametroFiltro[] = [];
  productosBackend: ParametroFiltro[] = [];

  // Opciones dinámicas dependientes (usando BehaviorSubject para reactividad)
  private clientesOptionsSubject = new BehaviorSubject<string[]>([]);
  private marcasOptionsSubject = new BehaviorSubject<string[]>([]);
  private productosOptionsSubject = new BehaviorSubject<string[]>([]);

  // Exponer como observables
  clientesOptions$ = this.clientesOptionsSubject.asObservable();
  marcasOptions$ = this.marcasOptionsSubject.asObservable();
  productosOptions$ = this.productosOptionsSubject.asObservable();

  filtroForm = new FormGroup({
    anunciante: new FormControl(''),
    cliente: new FormControl(''),
    marca: new FormControl(''),
    producto: new FormControl(''),
    numeroPlan: new FormControl(''),
    version: new FormControl(''),
    fechaInicio: new FormControl(''),
    fechaFin: new FormControl('')
  });

  filteredAnunciantes: Observable<string[]> = of([]);
  filteredClientes: Observable<string[]> = of([]);
  filteredMarcas: Observable<string[]> = of([]);
  filteredProductos: Observable<string[]> = of([]);

  // Datos de ejemplo para la tabla
  resultados: Resultado[] = [];

  displayedColumns: string[] = [
    'numeroPlan', 'version', 'pais', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania', 'fechaCreacion', 'estado'
  ];

  selectColumns: string[] = [
    'numeroPlan', 'version', 'pais', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania', 'fechaCreacion', 'estado'
  ];

  sort: Sort = {active: '', direction: ''};
  selectedRow: Resultado | null = null;

  dataSource = new MatTableDataSource<Resultado>([]);
  selection = new SelectionModel<Resultado>(false, []);
  totalCount = 0;
  currentPage = 0;
  // --- NUEVO: Propiedades para paginación ---
  pageIndex = 0;
  pageSize = 5;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sortMat!: MatSort;

  minFechaFin: Date | null = null; // <-- agrega esta propiedad

  allResultados: Resultado[] = []; // almacena todos los resultados para filtrar (local)
  allResultadosBackend: Resultado[] = []; // almacena todos los resultados del backend para filtrar

  columnLabels: { [key: string]: string } = {
    numeroPlan: 'Número de Plan',
    version: 'Versión',
    pais: 'País',
    anunciante: 'Anunciante',
    cliente: 'Cliente',
    marca: 'Marca',
    producto: 'Producto',
    fechaInicio: 'Fecha Inicio',
    fechaFin: 'Fecha Fin',
    campania: 'Campaña',
    fechaCreacion: 'Fecha Creación',
    estado: 'Estado'
  };
  filtros = {
    numeroPlan: '',
    version: '',
    anunciante: '',
    cliente: '',
    marca: '',
    producto: '',
    fechaInicio: '',
    fechaFin: ''
  };
  tablaParametros: any[] = [];
  isResetting: boolean = false;

  isLoading = false;
  estadoConexion: 'conectado' | 'error' | 'verificando' = 'verificando';

  constructor(private router: Router, private dialog: MatDialog, private snackBar: MatSnackBar, private planMediosService: PlanMediosService) {
    // Los observables se inicializarán después de cargar los datos del backend

    this.filtroForm.get('fechaInicio')!.valueChanges.subscribe((fechaInicioRaw: any) => {
      console.log(this.filtroForm)
  if (this.isResetting) return; 

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
    const fechaFinRaw = this.filtroForm.get('fechaFin')!.value;
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
      this.filtroForm.get('fechaFin')!.setValue('');
    }
  } else {
    this.minFechaFin = null;
    this.filtroForm.get('fechaFin')!.setValue('');
  }
    });

  }

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }

  /**
   * Obtener nombre del cliente por ID
   */
  private obtenerNombreCliente(id: number): string {
    const cliente = this.clientesBackend.find(c => c.id === id);
    return cliente ? cliente.nombre : 'Sin definir';
  }

  /**
   * Obtener nombre de la marca por ID
   */
  private obtenerNombreMarca(id: number): string {
    const marca = this.marcasBackend.find(m => m.id === id);
    return marca ? marca.nombre : 'Sin definir';
  }

  /**
   * Obtener nombre del producto por ID
   */
  private obtenerNombreProducto(id: number): string {
    const producto = this.productosBackend.find(p => p.id === id);
    return producto ? producto.nombre : 'Sin definir';
  }

  /**
   * Configura los listeners para los cambios en los campos de filtro
   */
  private configurarListeners(): void {
    // Cuando cambia anunciante, actualizar clientes y limpiar dependientes
    this.filtroForm.get('anunciante')!.valueChanges.subscribe((anunciante: string | null) => {
      const anuncianteObj = this.anunciantesBackend.find(a => a.nombre === anunciante);
      if (anuncianteObj) {
        const clientesOptions = this.clientesBackend
          .filter(c => c.padreId === anuncianteObj.id)
          .map(c => c.nombre);
        this.clientesOptionsSubject.next(clientesOptions);
      } else {
        this.clientesOptionsSubject.next([]);
      }
      this.marcasOptionsSubject.next([]);
      this.productosOptionsSubject.next([]);
      this.filtroForm.get('cliente')!.setValue('');
      this.filtroForm.get('marca')!.setValue('');
      this.filtroForm.get('producto')!.setValue('');
    });

    // Cuando cambia cliente, actualizar marcas y limpiar dependientes
    this.filtroForm.get('cliente')!.valueChanges.subscribe((cliente: string | null) => {
      const clienteObj = this.clientesBackend.find(c => c.nombre === cliente);
      if (clienteObj) {
        const marcasOptions = this.marcasBackend
          .filter(m => m.padreId === clienteObj.id)
          .map(m => m.nombre);
        this.marcasOptionsSubject.next(marcasOptions);
      } else {
        this.marcasOptionsSubject.next([]);
      }
      this.productosOptionsSubject.next([]);
      this.filtroForm.get('marca')!.setValue('');
      this.filtroForm.get('producto')!.setValue('');
    });

    // Cuando cambia marca, actualizar productos
    this.filtroForm.get('marca')!.valueChanges.subscribe((marca: string | null) => {
      const marcaObj = this.marcasBackend.find(m => m.nombre === marca);
      if (marcaObj) {
        const productosOptions = this.productosBackend
          .filter(p => p.padreId === marcaObj.id)
          .map(p => p.nombre);
        this.productosOptionsSubject.next(productosOptions);
      } else {
        this.productosOptionsSubject.next([]);
      }
      this.filtroForm.get('producto')!.setValue('');
    });
  }

  /**
   * Cargar datos de parámetros del backend
   */
  private cargarParametrosBackend(): void {
    this.isLoading = true;
    this.estadoConexion = 'verificando';

    this.planMediosService.obtenerTodosParametros()
      .pipe(
        retry(2),
        catchError((error) => {
          console.error('Error al cargar parámetros:', error);
          this.estadoConexion = 'error';
          this.snackBar.open('Error al cargar parámetros del backend', '', { duration: 3000 });
          return of([]);
        })
      )
      .subscribe((parametros: TablaParametro[]) => {
        this.procesarParametros(parametros);
        this.tablaParametros = parametros;
        // Después de cargar parámetros, cargar los datos del backend
        this.consultarBackend();
      });
  }

  /**
   * Procesar parámetros del backend y organizarlos por tabla
   */
  private procesarParametros(parametros: TablaParametro[]): void {
    // Filtrar solo parámetros activos
    const parametrosActivos = parametros.filter(p => p.campo_Est);

    // Separar por tabla
    const anunciantes = parametrosActivos.filter(p => p.tabla === 'ClientesAnunciante');
    const clientes = parametrosActivos.filter(p => p.tabla === 'ClientesFacturacion');
    const marcas = parametrosActivos.filter(p => p.tabla === 'Marcas');
    const productos = parametrosActivos.filter(p => p.tabla === 'Productos');

    // Convertir a estructura ParametroFiltro
    this.anunciantesBackend = anunciantes.map(a => ({
      id: a.campo_Id,
      nombre: a.campo_Val,
      descripcion: a.descripcion,
      padreId: a.campo_Padre_Id,
      activo: a.campo_Est
    }));

    this.clientesBackend = clientes.map(c => ({
      id: c.campo_Id,
      nombre: c.campo_Val,
      descripcion: c.descripcion,
      padreId: c.campo_Padre_Id,
      activo: c.campo_Est
    }));

    this.marcasBackend = marcas.map(m => ({
      id: m.campo_Id,
      nombre: m.campo_Val,
      descripcion: m.descripcion,
      padreId: m.campo_Padre_Id,
      activo: m.campo_Est
    }));

    this.productosBackend = productos.map(p => ({
      id: p.campo_Id,
      nombre: p.campo_Val,
      descripcion: p.descripcion,
      padreId: p.campo_Padre_Id,
      activo: p.campo_Est
    }));

    console.log('Parámetros cargados:', {
      anunciantes: this.anunciantesBackend.length,
      clientes: this.clientesBackend.length,
      marcas: this.marcasBackend.length,
      productos: this.productosBackend.length
    });

    // Inicializar observables después de cargar los datos
    this.inicializarObservables();
    // Configurar los listeners después de tener los datos
    this.configurarListeners();
  }

  /**
   * Inicializar observables del autocomplete con los datos cargados
   */
  private inicializarObservables(): void {
    // Autocomplete para anunciantes
    this.filteredAnunciantes = this.filtroForm.get('anunciante')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.anunciantesBackend.map(a => a.nombre)))
    );

    // Autocomplete para clientes (dependiente de anunciante)
    this.filteredClientes = combineLatest([
      this.filtroForm.get('cliente')!.valueChanges.pipe(startWith('')),
      this.clientesOptions$
    ]).pipe(
      map(([value, options]) => this._filter(value || '', options))
    );

    // Autocomplete para marcas (dependiente de cliente)
    this.filteredMarcas = combineLatest([
      this.filtroForm.get('marca')!.valueChanges.pipe(startWith('')),
      this.marcasOptions$
    ]).pipe(
      map(([value, options]) => this._filter(value || '', options))
    );

    // Autocomplete para productos (dependiente de marca)
    this.filteredProductos = combineLatest([
      this.filtroForm.get('producto')!.valueChanges.pipe(startWith('')),
      this.productosOptions$
    ]).pipe(
      map(([value, options]) => this._filter(value || '', options))
    );
  }

  buscar() {
    // Aplicar filtros localmente sobre los datos del backend
      this.buscarBackend();

    // this.aplicarFiltrosLocalmente();
  }

  // Método original de búsqueda local (renombrado para mantener funcionalidad)
  buscarLocal() {
    this.isLoading = true;
    setTimeout(() => {
      this.buscarBackend();
      this.isLoading = false;
    }, 400); // Simula carga visual
  }

  private formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

    borrarFiltros() {
      this.isResetting = true;

      this.filtroForm.reset();
      this.clientesOptionsSubject.next([]);
      this.marcasOptionsSubject.next([]);
      this.productosOptionsSubject.next([]);

      this.pageIndex = 0;
      this.pageSize = 5;

    }


  get tieneFiltrosActivos(): boolean {
    return Object.values(this.filtroForm.value).some(v => v !== null && v !== '');
  }

  ngOnInit() {
    // Cargar parámetros primero, luego los datos del backend
    this.cargarParametrosBackend();
    // Los datos del backend se cargarán automáticamente después de cargar parámetros
  }

  // Método original de ngOnInit (renombrado para mantener funcionalidad)
  cargarDatosLocales() {
    // Temporalmente deshabilitado para enfocar en integración del backend
    console.log('Carga de datos locales temporalmente deshabilitada');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      // Configurar paginación y ordenamiento
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sortMat;

      // --- NUEVO: Escuchar cambios de paginador ---
      if (this.paginator) {
        this.paginator.page.subscribe((event) => {
          this.pageIndex = event.pageIndex;
          this.pageSize = event.pageSize;
          this.consultarBackend();
        });
      }
      
      // Establecer ordenamiento por defecto descendente por número de plan
      if (this.sortMat) {
        this.sortMat.sort({
          id: 'numeroPlan',
          start: 'desc',
          disableClear: false
        });
      }
      
      // Configurar ordenamiento personalizado para fechas y números
      this.dataSource.sortingDataAccessor = (item: any, property: string) => {
        const value = item[property];
        
        switch (property) {
          case 'fechaInicio':
          case 'fechaFin':
          case 'fechaCreacion':
            // Convertir fecha a timestamp para ordenamiento
            if (!value) return 0;
            const date = new Date(value);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          
          case 'numeroPlan':
          case 'version':
            // Convertir a número para ordenamiento numérico
            const num = Number(value);
            return isNaN(num) ? 0 : num;
          
          case 'pais':
          case 'anunciante':
          case 'cliente':
          case 'marca':
          case 'producto':
          case 'campania':
          case 'estado':
            // Ordenamiento alfabético para strings
            return value ? value.toString().toLowerCase() : '';
          
          default:
            return value || '';
        }
      };
      
      // Configurar filtrado personalizado si es necesario
      this.dataSource.filterPredicate = (data: any, filter: string) => {
        const searchStr = Object.keys(data).reduce((currentTerm: string, key: string) => {
          return currentTerm + (data as any)[key] + '◬';
        }, '').toLowerCase();
        
        const transformedFilter = filter.trim().toLowerCase();
        return searchStr.indexOf(transformedFilter) !== -1;
      };
    }, 100);
  }

  sortData(sort: Sort) {
    console.log('Ordenando por:', sort.active, 'dirección:', sort.direction);
    
    // Forzar actualización del ordenamiento
    this.dataSource.sort = this.sortMat;
    
    // Disparar ordenamiento manual si es necesario
    if (sort.active && sort.direction !== '') {
      this.dataSource.data = this.dataSource.data.slice();
    }
  }

  seleccionarFila(resultado: Resultado) {
    this.selectedRow = this.selectedRow === resultado ? null : resultado;
  }

  esFilaSeleccionada(resultado: Resultado) {
    return this.selectedRow === resultado;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  checkboxLabel(row?: Resultado): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  rowClick(row: any, event: MouseEvent): void {
    this.selectedRow = row;
  }

  // Método removido - ya no se usa selectColumn

  onRowDoubleClick(row: Resultado) {
    // Busca todas las versiones para ese número de plan en los datos actuales de la grilla
    console.log('Abriendo diálogo de versiones para el plan:', row.numeroPlan);
    let filtros = {};
     this.planMediosService.consultarPaginadoWithDetailsPlan( Number(row.numeroPlan) ,this.pageIndex + 1, this.pageSize , filtros)
      .pipe(
        retry(2), // Reintentar 2 veces en caso de error
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe({
        next: (response: { items: PlanMediosConDetalles[], totalCount: number, pageSize: number, totalPages: number, page: number }) => {
          const versiones = response.items
        .filter(r => r.numeroPlan === row.numeroPlan)
        .map(plan => ({
          id: plan.idPlan.toString(),
          numeroPlan: plan.numeroPlan,
          version: plan.version.toString(),
          pais: plan.paisFacturacionDescripcion || 'N/A',
          anunciante: plan.clienteAnuncianteDescripcion || 'N/A',
          cliente: plan.clienteFacturacionDescripcion || this.obtenerNombreCliente(plan.idClienteFacturacion),
          marca: plan.marcaDescripcion || this.obtenerNombreMarca(plan.idMarca),
          producto: plan.productoDescripcion || this.obtenerNombreProducto(plan.idProducto),
          fechaInicio: typeof plan.fechaInicio === 'string' ? plan.fechaInicio.slice(0, 10) : plan.fechaInicio,
          fechaFin: typeof plan.fechaFin === 'string' ? plan.fechaFin.slice(0, 10) : plan.fechaFin,
          campania: plan.campania || 'N/A',
          fechaCreacion: typeof plan.fechaCreacion === 'string' ? plan.fechaCreacion.slice(0, 10) : plan.fechaCreacion,
          estado: plan.idEstadoRegistro === 1 ? 'Activo' : 'Inactivo',
          // IDs para mantener consistencia
          idPaisFacturacion: plan.idPaisFacturacion,
          idClienteAnunciante: plan.idClienteAnunciante,
          idClienteFacturacion: plan.idClienteFacturacion,
          idMarca: plan.idMarca,
          idProducto: plan.idProducto,
          idEstadoRegistro: plan.idEstadoRegistro
        }));

        const dialogRef = this.dialog.open(VersionesPlanDialog, {
          width: '85vw',
          maxWidth: '1100px',
          height: '75vh',
          maxHeight: '700px',
          data: { versiones, selectedRow: row },
          disableClose: true,
          panelClass: 'centered-modal'
        });
        dialogRef.afterClosed().subscribe(result => {
          this.recargarTabla(); // <-- Recarga el listado general
        });
        },
        error: (error) => {
          // Este caso no debería ocurrir por el catchError, pero por seguridad
          console.error('Error no manejado:', error);
          this.isLoading = false;
        }
      });
    
    this.selectedRow = null;
  }

  getColumnLabel(column: string): string {
    if (column === 'estado') return 'Estado';
    return this.columnLabels[column] || column;
  }

  getDisplayValue(row: any, column: string): string {
    const value = row[column];
    if (column === 'estado') {
      return value || 'Sin definir';
    }
    if (typeof value === 'boolean') {
      return value ? 'Aprobado' : 'Sin aprobar';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return value ?? '';
  }

  // --- NUEVO: Copiar plan ---
  copiarPlan() {
    if (!this.selectedRow) return;
    this.openConfirmDialog('¿Deseas copiar este plan?').afterClosed().subscribe(result => {
      if (result) {
        const planesGuardados: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        // Buscar el plan original por id
        const original = planesGuardados.find(p => p.id === this.selectedRow!.id);
        if (!original) return;
        // Generar nuevo id y número de plan consecutivo
        let lastNumeroPlan = 1000;
        if (planesGuardados.length > 0) {
          const max = Math.max(
            ...planesGuardados
              .map(p => parseInt(p.numeroPlan, 10))
              .filter(n => !isNaN(n))
          );
          if (!isNaN(max) && max >= 1000) lastNumeroPlan = max + 1;
        }
        const nuevoPlan = {
          ...original,
          id: Date.now().toString(),
          numeroPlan: lastNumeroPlan.toString(),
          version: "1"
        };
        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        this.snackBar.open('Plan copiado correctamente', '', { duration: 2000 });
        this.recargarTabla();
        this.selectedRow = null; // <-- Limpia la selección después de copiar
      }
    });
  }

  // --- NUEVO: Nueva versión ---
  nuevaVersion() {
    if (!this.selectedRow) return;
    this.openConfirmDialog('¿Deseas crear una nueva versión de este plan?').afterClosed().subscribe(result => {
      if (result) {
        const planesGuardados: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        // Buscar el plan original por id
        const original = planesGuardados.find(p => p.id === this.selectedRow!.id);
        if (!original) return;
        // Calcular nueva versión (consecutivo)
        let nuevaVersion = 1;
        const versiones = planesGuardados
          .filter(p => p.numeroPlan === original.numeroPlan)
          .map(p => parseInt(p.version, 10))
          .filter(n => !isNaN(n));
        if (versiones.length > 0) {
          nuevaVersion = Math.max(...versiones) + 1;
        }
        // Mantener el mismo numeroPlan, solo cambia el id y la version
        const nuevoPlan = {
          ...original,
          id: Date.now().toString(),
          version: nuevaVersion.toString()
        };
        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        this.snackBar.open('Nueva versión creada correctamente', '', { duration: 2000 });
        this.recargarTabla();
        this.selectedRow = null; // <-- Limpia la selección después de nueva versión
      }
    }); 
  }

  // --- NUEVO: Diálogo de confirmación ---
  openConfirmDialog(msg: string) {
    return this.dialog.open(ConfirmDialogComponent, {
      data: { message: msg }
    });
  }

    // --- NUEVO: Recargar tabla después de cambios ---
  recargarTabla() {
    // Recargar datos del backend para mantener consistencia
    this.consultarBackend();
  }

  

    onPageChange(event: PageEvent): void {
      this.pageSize = event.pageSize;
      this.pageIndex = event.pageIndex;
      this.currentPage = event.pageIndex;
      this.consultarBackend(); // Recarga la tabla con la nueva página
    }


  // --- MÉTODOS PARA INTEGRACIÓN CON BACKEND ---
  
  /**
   * Consulta planes con detalles del backend
   */
  consultarBackend(): void {
    // Solo poner isLoading = true si no está ya cargando
    if (!this.isLoading) {
      this.isLoading = true;
      this.estadoConexion = 'verificando';
    }
    
    
    // --- CAMBIO: Usar pageIndex y pageSize ---
  this.planMediosService.consultarPaginadoWithDetails(this.pageIndex + 1 , this.pageSize, this.filtros)
      .pipe(
        retry(2), // Reintentar 2 veces en caso de error
        catchError((error) => {
          console.error('Error al consultar backend después de reintentos:', error);
          
          this.estadoConexion = 'error';
          
          // Mostrar mensaje de error específico
          let mensajeError = 'Error al cargar datos del backend';
          if (error.status === 0) {
            mensajeError = 'No se pudo conectar al backend. Verificar que esté ejecutándose.';
          } else if (error.status === 404) {
            mensajeError = 'Endpoint no encontrado. Verificar la URL del backend.';
          } else if (error.status === 500) {
            mensajeError = 'Error interno del servidor backend.';
          }
          
          this.snackBar.open(mensajeError, '', { duration: 5000 });
          
          // Ofrecer cargar datos locales como fallback
          this.mostrarOpcionFallback();
          
          // Retornar observable vacío para completar el flujo
          return of([]);
        })
      )
      .subscribe({
        next: (response: { items: PlanMediosConDetalles[], totalCount: number, pageSize: number, totalPages: number, page: number }) => {
          // Convertir los datos del backend al formato local
          const resultadosBackend = response.items.map((item: PlanMediosConDetalles) => ({
            id: item.idPlan.toString(),
            numeroPlan: item.numeroPlan,
            version: item.version.toString(),
            pais: item.paisFacturacionDescripcion,
            anunciante: item.clienteAnuncianteDescripcion,
            cliente: item.clienteFacturacionDescripcion || this.obtenerNombreCliente(item.idClienteFacturacion),
            marca: item.marcaDescripcion || this.obtenerNombreMarca(item.idMarca),
            producto: item.productoDescripcion || this.obtenerNombreProducto(item.idProducto),
            fechaInicio: typeof item.fechaInicio === 'string' ? item.fechaInicio.slice(0, 10) : item.fechaInicio,
            fechaFin: typeof item.fechaFin === 'string' ? item.fechaFin.slice(0, 10) : item.fechaFin,
            campania: item.campania,
            fechaCreacion: typeof item.fechaCreacion === 'string' ? item.fechaCreacion.slice(0, 10) : item.fechaCreacion,
            estado: item.idEstadoRegistro === 1 ? 'Activo' : 'Inactivo',
            // IDs para filtros
            idPaisFacturacion: item.idPaisFacturacion,
            idClienteAnunciante: item.idClienteAnunciante,
            idClienteFacturacion: item.idClienteFacturacion,
            idMarca: item.idMarca,
            idProducto: item.idProducto,
            idEstadoRegistro: item.idEstadoRegistro
          }));
          
          // Almacenar todos los datos del backend para filtrado local
          this.allResultadosBackend = resultadosBackend;
          
          // Aplicar filtros localmente
          this.aplicarFiltrosLocalmente();
          
          // Actualizar el total del paginador
          if (this.paginator) {
            this.paginator.length = response.totalCount;
          }
          this.totalCount = response.totalCount;
          this.pageSize = response.pageSize;
          this.currentPage = response.page - 1;
          this.isLoading = false;
          this.estadoConexion = 'conectado';
          

          // Asegurar que el ordenamiento esté configurado después de cargar datos
          setTimeout(() => {
            if (this.sortMat && this.dataSource) {
              this.dataSource.sort = this.sortMat;
              // Establecer ordenamiento por defecto descendente por número de plan
              this.sortMat.sort({
                id: 'numeroPlan',
                start: 'desc',
                disableClear: false
              });
            }
          }, 100);
          
          if (response.items.length > 0) {
            //this.snackBar.open(`Se cargaron ${response.items.length} registros del backend`, '', { duration: 2000 });
          } else {
            this.snackBar.open('No se encontraron registros en el backend', '', { duration: 2000 });
          }
        },
        error: (error) => {
          // Este caso no debería ocurrir por el catchError, pero por seguridad
          console.error('Error no manejado:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Aplica filtros localmente sobre los datos cargados del backend
   */
  private aplicarFiltrosLocalmente(): void {
    const filtros = this.filtroForm.value;
    let filtrados = this.allResultadosBackend;

    // Aplicar filtros según los valores del formulario
    if (filtros.numeroPlan) {
      filtrados = filtrados.filter(r => r.numeroPlan.includes(filtros.numeroPlan as string));
    }
    if (filtros.version) {
      filtrados = filtrados.filter(r => r.version.includes(filtros.version as string));
    }
    if (filtros.anunciante) {
      const anuncianteObj = this.anunciantesBackend.find(a => a.nombre === filtros.anunciante);
      if (anuncianteObj) {
        filtrados = filtrados.filter(r => r.idClienteAnunciante === anuncianteObj.id);
      }
    }
    if (filtros.cliente) {
      const clienteObj = this.clientesBackend.find(c => c.nombre === filtros.cliente);
      if (clienteObj) {
        filtrados = filtrados.filter(r => r.idClienteFacturacion === clienteObj.id);
      }
    }
    if (filtros.marca) {
      const marcaObj = this.marcasBackend.find(m => m.nombre === filtros.marca);
      if (marcaObj) {
        filtrados = filtrados.filter(r => r.idMarca === marcaObj.id);
      }
    }
    if (filtros.producto) {
      const productoObj = this.productosBackend.find(p => p.nombre === filtros.producto);
      if (productoObj) {
        filtrados = filtrados.filter(r => r.idProducto === productoObj.id);
      }
    }
    if (filtros.fechaInicio) {
      filtrados = filtrados.filter(r => r.fechaInicio === this.formatDate(filtros.fechaInicio));
    }
    if (filtros.fechaFin) {
      filtrados = filtrados.filter(r => r.fechaFin === this.formatDate(filtros.fechaFin));
    }

    // Ordenar por número de plan descendente (más reciente primero) por defecto
    filtrados = filtrados.sort((a, b) => {
      const numPlanA = parseInt(a.numeroPlan, 10);
      const numPlanB = parseInt(b.numeroPlan, 10);
      return numPlanB - numPlanA; // Orden descendente
    });
    
    // Actualizar la tabla con los resultados filtrados
    this.dataSource.data = filtrados;
    
    // Forzar actualización del ordenamiento después de filtrar
    if (this.sortMat) {
      this.dataSource.sort = this.sortMat;
    }
  }
  getId = (tabla: string, value: string, parentId?: number) => {
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
  buscarBackend() {
    const filtros = this.filtroForm.value;
      // IDs principales (campo_Id)
    const safe = (v: string | null) => v ?? '';
    const idClienteAnunciante = this.getId('ClientesAnunciante', safe(filtros.anunciante || ''));
    const idClienteFacturacion = this.getId('ClientesFacturacion', safe(filtros.cliente || ''), idClienteAnunciante);
    const idMarca = this.getId('Marcas', safe(filtros.marca || ''), idClienteFacturacion);
    const idProducto = this.getId('Productos', safe(filtros.producto || ''), idMarca);

    this.filtros.numeroPlan = filtros.numeroPlan || '';
    this.filtros.version = filtros.version || '';
    this.filtros.anunciante = idClienteAnunciante || '';
    this.filtros.cliente = idClienteFacturacion || '';
    this.filtros.marca = idMarca || '';
    this.filtros.producto = idProducto || '';
    this.filtros.fechaInicio = filtros.fechaInicio || '';
    this.filtros.fechaFin = filtros.fechaFin || '';

    this.consultarBackend();
  }

  /**
   * Método para buscar en backend con filtros
   */
  buscarEnBackend(): void {
    this.consultarBackend();
  }

  /**
   * Cambiar la URL del backend
   * @param index 0 = puerto 7223 (HTTPS), 1 = puerto 5000, 2 = puerto 5001, 3 = puerto 7000
   */
  cambiarBackendUrl(index: number): void {
    this.planMediosService.setBackendUrl(index);
    this.snackBar.open(`Backend cambiado a: ${this.planMediosService.getCurrentUrl()}`, '', { duration: 3000 });
    // Recargar todos los datos del nuevo backend
    this.consultarBackend();
  }

  /**
   * Obtener el índice del backend actual
   */
  getBackendIndex(): number {
    const currentUrl = this.planMediosService.getCurrentUrl();
    if (currentUrl.includes(':7223')) return 0;
    if (currentUrl.includes(':5000')) return 1;
    if (currentUrl.includes(':5001')) return 2;
    if (currentUrl.includes(':7000')) return 3;
    return 0; // Por defecto puerto 7223
  }

  /**
   * Mostrar opción de fallback para cargar datos locales
   */
  mostrarOpcionFallback(): void {
    const snackBarRef = this.snackBar.open(
      'Backend no disponible. ¿Cargar datos locales?', 
      'Cargar Local', 
      { duration: 8000 }
    );
    
    snackBarRef.onAction().subscribe(() => {
      this.cargarDatosLocales();
    });
  }
}

@NgComponent({
  selector: 'confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatDialogActions, MatDialogContent, MatDialogTitle], 
  template: `
    <h2 mat-dialog-title style="font-family: 'Montserrat', 'Roboto', Arial, sans-serif; font-size:1.5rem; font-weight:700; color:#3c5977; letter-spacing:1px; text-transform:uppercase; margin-bottom:0;">
      Confirmar
    </h2>
    <mat-dialog-content style="font-family: 'Montserrat', 'Roboto', Arial, sans-serif; font-size:1.15rem; color:#222; margin-bottom:24px;">
      {{ data.message }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="accent"
        style="font-size:1.15rem;padding:14px 36px;min-width:160px;font-weight:300;letter-spacing:1px;margin-right:10px;background:#26c6da;color:#252525;font-family:'Montserrat','Roboto',Arial,sans-serif;"
        (click)="onNo()">Cancelar</button>
      <button mat-raised-button color="primary" type="button"
        style="font-size:1.15rem;padding:14px 36px;min-width:160px;font-weight:300;letter-spacing:1px;background:#3c5977;color:#fff;font-family:'Montserrat','Roboto',Arial,sans-serif;"
        (click)="onYes()">Aceptar</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}
  onNo() { this.dialogRef.close(false); }
  onYes() { this.dialogRef.close(true); }
}

// --- DIALOGO DE VERSIONES ---
import { Component as NgComponent, Inject, AfterViewInit } from '@angular/core';

@NgComponent({
  selector: 'versiones-plan-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatSortModule
  ],
  template: `
    <h2 mat-dialog-title>Versiones del Plan {{ data.versiones[0]?.numeroPlan || '' }}</h2>
    
    <mat-dialog-content>
      <div style="margin-bottom: 16px;">
        <form [formGroup]="filtroForm">
          <mat-form-field appearance="fill" style="margin-right: 16px;">
            <mat-label>Buscar por versión</mat-label>
            <input matInput (keydown)="soloNumerosYSlashVersion($event)" formControlName="version" placeholder="Ej: 1" />
          </mat-form-field>
          
          <mat-form-field appearance="fill" style="margin-right: 16px;">
          <mat-label>Fecha de creación</mat-label>
          <input
              matInput
              placeholder="dd/mm/yyyy"
              formControlName="fechaCreacion"
              maxlength="10"
              (keydown)="soloNumerosYSlash($event)"
            />
          </mat-form-field>

          <button mat-raised-button (click)="limpiarFiltros()">Limpiar</button>
        </form>
      </div>

      <div class="mat-elevation-z8">
        <table mat-table [dataSource]="dataSource" matSort>
          <ng-container matColumnDef="fechaCreacion">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha Creación</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ formatearFecha(row.fechaCreacion) }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="version">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Versión</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ row.version }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="fechaInicio">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha Inicio</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ formatearFecha(row.fechaInicio) }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="fechaFin">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha Fin</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ formatearFecha(row.fechaFin) }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="campania">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Campaña</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ row.campania || 'N/A' }}
            </td>
          </ng-container>
          
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Estado</th>
            <td mat-cell *matCellDef="let row" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)">
              {{ row.estado ? 'Aprobado' : 'Sin aprobar' }}
            </td>
          </ng-container>
          
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)"></tr>
        </table>
        
        <mat-paginator [length]="totalCount"
        [pageSize]="pageSize"
        [pageIndex]="currentPage"
        [pageSizeOptions]="[5, 10, 20]"
        (page)="onPageChange($event)" showFirstLastButtons aria-label="Select page"></mat-paginator>
        </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cerrar</button>
      <button mat-raised-button color="primary" (click)="copiarPlan()" [disabled]="!selectedRow">
        Copiar plan
      </button>
      <button mat-raised-button color="accent" (click)="nuevaVersion()" [disabled]="!selectedRow">
        Nueva versión
      </button>
      <button mat-raised-button color="accent" (click)="editarPlan()" [disabled]="!selectedRow">
        Editar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .selected-row {
      background-color: #e3f2fd !important;
    }
    
    table {
      width: 100%;
      margin: 0 auto;
    }
    
    .mat-elevation-z8 {
      margin: 0 auto;
      max-width: 100%;
    }
    
    td {
      cursor: pointer;
      text-align: center !important;
    }
    
    th {
      text-align: center !important;
    }
    
    .mat-dialog-content {
      max-height: 500px;
      overflow-y: auto;
    }
    
    /* Forzar centrado de todas las columnas */
    :host ::ng-deep .mat-header-cell {
      text-align: center !important;
      justify-content: center !important;
    }
    
    :host ::ng-deep .mat-cell {
      text-align: center !important;
      justify-content: center !important;
    }
    
    :host ::ng-deep .mat-header-row .mat-header-cell {
      text-align: center !important;
    }
    
    :host ::ng-deep .mat-row .mat-cell {
      text-align: center !important;
    }
    
    /* Espaciado uniforme de columnas */
    :host ::ng-deep .mat-header-cell,
    :host ::ng-deep .mat-cell {
      padding: 8px 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    /* Centrar contenido del modal */
    .mat-dialog-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  `]
})
export class VersionesPlanDialog implements AfterViewInit {
  displayedColumns = ['fechaCreacion', 'version', 'fechaInicio', 'fechaFin', 'campania', 'estado'];
  dataSource: MatTableDataSource<any>;
  selectedRow: any = null;
  isLoading = false;
  
  // Propiedades para filtros
  filtroForm = new FormGroup({
    version: new FormControl(''),
    fechaCreacion: new FormControl('', { validators: [] })
  });
  datosOriginales: any[] = [];
  totalCount = 0;
  currentPage = 0;
  // --- NUEVO: Propiedades para paginación ---
  pageIndex = 0;
  pageSize = 5;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<VersionesPlanDialog>,
    private planMediosService: PlanMediosService,
    @Inject(MAT_DIALOG_DATA) public data: { versiones: any[], selectedRow?: any }
  ) {
    this.datosOriginales = data.versiones; // Guardar datos originales
    this.dataSource = new MatTableDataSource<any>(data.versiones); // <-- inicializa aquí
    
    // Seleccionar automáticamente el registro correspondiente al de la grilla principal
    if (data.selectedRow) {
      const foundRow = data.versiones.find(v => 
        v.id === data.selectedRow.id && 
        v.version === data.selectedRow.version
      );
      
      if (foundRow) {
        this.selectedRow = foundRow;
      } else {
        // Si no se encuentra por ID y version, buscar solo por ID
        const foundById = data.versiones.find(v => v.id === data.selectedRow.id);
        this.selectedRow = foundById || data.versiones[0];
      }
    } else {
      this.selectedRow = data.versiones[0];
    }
    
    
    // Configurar listeners para filtros automáticos con debounce
    this.filtroForm.get('version')!.valueChanges.pipe(
      startWith(''),
      map(value => value || '')
    ).subscribe(() => {
      setTimeout(() => this.aplicarFiltros(), 100);
    });
    
    this.filtroForm.get('fechaCreacion')!.valueChanges.subscribe((valor: any) => {
      const valorString = typeof valor === 'string' ? valor : '';
      
      if (valorString.length === 10) {
        setTimeout(() => this.aplicarFiltros(), 100);
      }
    });

}

      soloNumerosYSlashVersion(event: KeyboardEvent): void {
        const allowedKeys = [
          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
        ];
        const inputChar = event.key;
        const regex = /[0-9/]/;

        if (!regex.test(inputChar) && !allowedKeys.includes(inputChar)) {
          event.preventDefault(); // Bloquea letras, símbolos, etc.
        }
      }

   soloNumerosYSlash(event: KeyboardEvent): void {
        const input = event.target as HTMLInputElement;
        const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab'];
        const key = event.key;

        // Permitir solo números y teclas permitidas
        if (!/[0-9]/.test(key) && !allowedKeys.includes(key)) {
          event.preventDefault();
          return;
        }

        setTimeout(() => {
          let valor = input.value.replace(/\D/g, ''); // Quitar todo menos números

          if (valor.length > 8) {
            valor = valor.substring(0, 8); // Limitar a 8 números
          }

          if (valor.length > 4) {
            // dd/mm/yyyy
            input.value = `${valor.substring(0, 2)}/${valor.substring(2, 4)}/${valor.substring(4)}`;
          } else if (valor.length > 2) {
            // dd/mm
            input.value = `${valor.substring(0, 2)}/${valor.substring(2)}`;
          } else {
            // dd
            input.value = valor;
          }
        });
    }




  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Configurar ordenamiento personalizado
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      const value = item[property];
      
      switch (property) {
        case 'fechaCreacion':
        case 'fechaInicio':
        case 'fechaFin':
          if (!value) return 0;
          const date = new Date(value);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        
        case 'version':
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        
        default:
          return value ? value.toString().toLowerCase() : '';
      }
    };
  }

  /**
   * Método para manejar el ordenamiento
   */
  sortData(sort: Sort) {
    if (sort.active && sort.direction !== '') {
      this.dataSource.data = this.dataSource.data.slice();
    }
  }

  /**
   * Método para formatear fechas
   */
formatearFecha(fecha: string | Date): string {
  if (!fecha) return 'N/A';

  try {
    let date: Date;

    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      // Evita interpretación en UTC construyendo como fecha local
      const [year, month, day] = fecha.split('-').map(Number);
      date = new Date(year, month - 1, day); // mes va de 0 a 11
    } else {
      date = new Date(fecha);
    }

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

  selectRow(row: any) {
    this.selectedRow = row;
  }

  cerrar() {
    this.dialogRef.close();
  }

  aplicarFiltros() {
    this.recargarTabla(this.data.selectedRow.numeroPlan,1, this.pageSize); // Recarga la tabla con la nueva página
  }

  limpiarFiltros() {
    this.filtroForm.reset();
    this.recargarTabla(this.data.selectedRow.numeroPlan,this.pageIndex + 1, this.pageSize); // Recarga la tabla con la nueva página
  }

  private formatDate(date: any): string {
        if (!date) return '';

        if (typeof date === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

          // Detectar y convertir "DD/MM/YYYY"
          const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (match) {
            const [_, day, month, year] = match;
            return `${year}-${month}-${day}`;
          }
        }

        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
    } 

  redirigir(row: Resultado) {
    debugger;
    const planData = {
      id: row.id,
      numeroPlan: row.numeroPlan,
      version: row.version,
      cliente: row.cliente,
      producto: row.producto,
      campana: row.campania,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      idPaisFacturacion: row.idPaisFacturacion,
      idClienteAnunciante: row.idClienteAnunciante,
      idClienteFacturacion: row.idClienteFacturacion,
      idMarca: row.idMarca,
      idProducto: row.idProducto,
      idEstadoRegistro: row.idEstadoRegistro
    };
    
    this.router.navigate(['/plan-medios-resumen'], { 
      state: { planData } 
    });
    
    this.dialogRef.close();
  }

    // --- NUEVO: Diálogo de confirmación ---
  openConfirmDialog(msg: string) {
    return this.dialog.open(ConfirmDialogComponent, {
      data: { message: msg }
    });
  }
   // --- NUEVO: Copiar plan ---
  copiarPlan() {
    if (!this.selectedRow) return;
    
    console.log('📋 Copiando plan con datos de la versión seleccionada:', this.selectedRow);
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Copiar plan',
        message: '¿Estás seguro que deseas copiar este plan? Se generará un nuevo número de plan.'
      }
    });
    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.dialogRef.close(true);
        this.router.navigate(['/plan-medios-copiar', this.selectedRow.id]);
      }
    });
  }

  // --- NUEVO: Nueva versión ---
  nuevaVersion() {
    if (!this.selectedRow) return;
    this.openConfirmDialog('¿Deseas crear una nueva versión de este plan?').afterClosed().subscribe(result => {
      if (result) {
        this.planMediosService.newVersion(this.selectedRow.id, 0)
        .subscribe({
          next: (nuevoPlan) => {
            this.snackBar.open('Nueva versión creada correctamente', '', { duration: 2000 });
            this.recargarTabla(this.selectedRow!.numeroPlan);
            this.selectedRow = null; // <-- Limpia la selección después de nueva versión
          },
          error: (err) => {
            console.error('Error al crear nueva versión', err);
          }
        });
        
      }
    }); 
  }

  editarPlan() {
    if (!this.selectedRow) return;
    
    console.log('✏️ Editando plan con datos de la versión seleccionada:', this.selectedRow);
    
    this.dialogRef.close(true);
    this.router.navigate(['/plan-medios-editar', this.selectedRow.id]);
  }

  
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.currentPage = event.pageIndex;
    this.recargarTabla(this.data.selectedRow.numeroPlan,this.pageIndex + 1, this.pageSize); // Recarga la tabla con la nueva página
  }

  
  recargarTabla(id: string , pageIndex: number = 1, pageSize: number = 10): void {
    this.isLoading = true;
    let filtros = this.filtroForm;
    console.log('Recargando tabla con filtros:', filtros.value);
    this.planMediosService.consultarPaginadoWithDetailsPlan( Number(id) ,pageIndex, pageSize ,filtros.value)
    .pipe(
      retry(2), // Reintentar 2 veces en caso de error
      catchError((error) => {
        return of([]);
      })
    )
    .subscribe({
      next: (response: { items: PlanMediosConDetalles[], totalCount: number, pageSize: number, totalPages: number, page: number }) => {
        console.log('Datos obtenidos del backend:', response);
      const versiones = response.items
      .filter(r => r.numeroPlan === id)
      .map(plan => ({
        id: plan.idPlan,
        numeroPlan: plan.numeroPlan,
        version: plan.version,
        pais: plan.idPaisFacturacion,
        anunciante: plan.idClienteAnunciante,
        cliente: plan.idClienteAnunciante,
        marca: plan.idMarca,
        producto: plan.idProducto,
        fechaInicio: plan.fechaInicio,
        fechaFin: plan.fechaFin,
        campania: plan.campania,
        fechaCreacion: plan.fechaCreacion,
        estado: plan.idEstadoRegistro,
        // IDs para mantener consistencia
        idPaisFacturacion: plan.idPaisFacturacion,
        idClienteAnunciante: plan.idClienteAnunciante,
        idClienteFacturacion: plan.idClienteFacturacion,
        idMarca: plan.idMarca,
        idProducto: plan.idProducto,
        idEstadoRegistro: plan.idEstadoRegistro
      })
    );
      this.dataSource.data = versiones;
      this.isLoading = false;
      
      
      },
      error: (error) => {
        // Este caso no debería ocurrir por el catchError, pero por seguridad
        console.error('Error no manejado:', error);
        this.isLoading = false;
      }
    });
     
   // Simula carga
  }

  

}
