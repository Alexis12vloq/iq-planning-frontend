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
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
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

  isLoading = false;
  estadoConexion: 'conectado' | 'error' | 'verificando' = 'verificando';

  constructor(private router: Router, private dialog: MatDialog, private snackBar: MatSnackBar, private planMediosService: PlanMediosService) {
    // Los observables se inicializarán después de cargar los datos del backend

    // Lógica de fechas igual que en creación
    this.filtroForm.get('fechaInicio')!.valueChanges.subscribe((fechaInicioRaw: any) => {
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
    this.aplicarFiltrosLocalmente();
  }

  // Método original de búsqueda local (renombrado para mantener funcionalidad)
  buscarLocal() {
    this.isLoading = true;
    setTimeout(() => {
      // Filtra la data según los valores del formulario
      const filtros = this.filtroForm.value;
      let filtrados = this.allResultados;

      if (filtros.numeroPlan) {
        filtrados = filtrados.filter(r => r.numeroPlan.includes(filtros.numeroPlan as string));
      }
      if (filtros.anunciante) {
        filtrados = filtrados.filter(r => r.anunciante.toLowerCase().includes((filtros.anunciante as string).toLowerCase()));
      }
      if (filtros.cliente) {
        filtrados = filtrados.filter(r => r.cliente.toLowerCase().includes((filtros.cliente as string).toLowerCase()));
      }
      if (filtros.marca) {
        filtrados = filtrados.filter(r => r.marca.toLowerCase().includes((filtros.marca as string).toLowerCase()));
      }
      if (filtros.producto) {
        filtrados = filtrados.filter(r => r.producto.toLowerCase().includes((filtros.producto as string).toLowerCase()));
      }
      if (filtros.fechaInicio) {
        filtrados = filtrados.filter(r => r.fechaInicio === this.formatDate(filtros.fechaInicio));
      }
      if (filtros.fechaFin) {
        filtrados = filtrados.filter(r => r.fechaFin === this.formatDate(filtros.fechaFin));
      }

      // Ordenar por fecha de creación descendente (más reciente primero)
      filtrados = filtrados.sort((a: any, b: any) => new Date(b.fechaCreacion || b.id).getTime() - new Date(a.fechaCreacion || a.id).getTime());
      this.dataSource.data = filtrados;
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
    this.filtroForm.reset();
    this.clientesOptionsSubject.next([]);
    this.marcasOptionsSubject.next([]);
    this.productosOptionsSubject.next([]);
    // Mostrar todos los datos del backend sin filtros
    this.aplicarFiltrosLocalmente();
    
    // Mantener el ordenamiento después de limpiar filtros
    setTimeout(() => {
      if (this.sortMat && this.dataSource) {
        this.dataSource.sort = this.sortMat;
      }
    }, 100);
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
    // Busca todas las versiones para ese número de plan
    const planesGuardados: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
    const versiones = planesGuardados
      .filter(p => p.numeroPlan === row.numeroPlan)
      .map(plan => ({
        id: plan.id,
        numeroPlan: plan.numeroPlan,
        version: plan.version,
        pais: plan.paisFacturacion,
        anunciante: plan.clienteAnunciante,
        cliente: plan.clienteFueActuacion,
        marca: plan.marca,
        producto: plan.producto,
        fechaInicio: plan.fechaInicio,
        fechaFin: plan.fechaFin,
        campania: plan.campana,
        tipoIngresoPlan: plan.tipoIngresoPlan || 'Plan de Medios',
                  fechaCreacion: plan.fechaCreacion || new Date().toISOString().slice(0, 10), // Incluir fecha de creación
          estado: plan.estado ?? false
          // tipoIngresoPlan: plan.tipoIngresoPlan || 'Plan de Medios', // Temporalmente comentado
      }))
      .sort((a, b) => parseInt(b.version, 10) - parseInt(a.version, 10));

    const dialogRef = this.dialog.open(VersionesPlanDialog, {
      width: '90vw',
      maxWidth: '700px',
      data: { versiones },
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.recargarTabla(); // <-- Recarga el listado general
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
    // Temporalmente deshabilitado para enfocar en integración del backend
    console.log('Recarga de tabla temporalmente deshabilitada');
    // En lugar de cargar datos locales, recargamos datos del backend
    this.consultarBackend();
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
    
    // Usar el nuevo servicio para obtener planes con detalles
    this.planMediosService.consultarPlanesConDetalles()
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
        next: (response: PlanMediosConDetalles[]) => {
          // Convertir los datos del backend al formato local
          const resultadosBackend = response.map((item: PlanMediosConDetalles) => ({
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
          
          this.isLoading = false;
          this.estadoConexion = 'conectado';
          
          // Asegurar que el ordenamiento esté configurado después de cargar datos
          setTimeout(() => {
            if (this.sortMat && this.dataSource) {
              this.dataSource.sort = this.sortMat;
            }
          }, 100);
          
          if (response.length > 0) {
            this.snackBar.open(`Se cargaron ${response.length} registros del backend`, '', { duration: 2000 });
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

    // Ordenar por fecha de creación descendente (más reciente primero) por defecto
    filtrados = filtrados.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    
    // Actualizar la tabla con los resultados filtrados
    this.dataSource.data = filtrados;
    
    // Forzar actualización del ordenamiento después de filtrar
    if (this.sortMat) {
      this.dataSource.sort = this.sortMat;
    }
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
    FormsModule
  ],
  template: `
      <h2 mat-dialog-title 
          style="font-family: 'Montserrat', 'Roboto', Arial, sans-serif; font-size:1.5rem; font-weight:700; color:#3c5977; letter-spacing:1px; text-transform:uppercase; margin-bottom:0; display: flex; justify-content: space-between; align-items: center; padding: 24px;">
        
        <span>
          Versiones del Plan {{ data.versiones[0]?.numeroPlan || '' }}
        </span>

        <button mat-icon-button  (click)="cerrar()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

    <mat-dialog-content style="padding: 24px; width: 100%;">
      <!-- Filtros -->
      <div class="filtros-container" style="margin-bottom: 24px; display: flex; gap: 24px; align-items: center;">
        <mat-form-field appearance="outline" style="width: 250px;">
          <mat-label>Buscar por versión</mat-label>
          <input matInput [(ngModel)]="filtroVersion" (input)="aplicarFiltros()" placeholder="Ej: 1">
        </mat-form-field>
        
        <mat-form-field appearance="outline" style="width: 250px;">
          <mat-label>Fecha de creación</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="filtroFechaCreacion" (dateChange)="aplicarFiltros()">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        
        <button mat-raised-button color="primary" (click)="limpiarFiltros()" style="height: 48px; padding: 0 24px;">
          <mat-icon>clear</mat-icon>
          Limpiar filtros
        </button>
      </div>

      <div style="margin-bottom:24px;">
        <div class="mat-elevation-z8">
          <table mat-table [dataSource]="dataSource" matSort class="mat-elevation-z8" style="width:100%;">
            <ng-container matColumnDef="fechaCreacion">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="font-weight: bold; padding: 12px 16px; min-width: 140px;">Fecha Creación</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="font-weight: bold; padding: 12px 16px;">
                {{ row.fechaCreacion || 'N/A' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="padding: 12px 16px; min-width: 100px;">Versión</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="padding: 12px 16px;">
                {{ row.version }}
              </td>
            </ng-container>
            <ng-container matColumnDef="fechaInicio">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="padding: 12px 16px; min-width: 140px;">Fecha Inicio</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="padding: 12px 16px;">
                {{ row.fechaInicio }}
              </td>
            </ng-container>
            <ng-container matColumnDef="fechaFin">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="padding: 12px 16px; min-width: 140px;">Fecha Fin</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="padding: 12px 16px;">
                {{ row.fechaFin }}
              </td>
            </ng-container>
            <ng-container matColumnDef="campania">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="padding: 12px 16px; min-width: 160px;">Campaña</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="padding: 12px 16px;">
                {{ row.campania }}
              </td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef mat-sort-header style="padding: 12px 16px; min-width: 140px;">Estado</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" style="padding: 12px 16px;">
                {{ row.estado ? 'Aprobado' : 'Sin aprobar' }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons aria-label="Select page" style="padding: 16px;"></mat-paginator>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="center" style="display:flex; flex-direction:row; gap:32px; padding: 24px;">
      <button mat-raised-button color="primary" (click)="copiarPlan()" [disabled]="!selectedRow" style="padding: 12px 24px; font-size: 16px;">
        <mat-icon>content_copy</mat-icon> Copiar plan
      </button>
      <button mat-raised-button color="accent" (click)="nuevaVersion()" [disabled]="!selectedRow" style="padding: 12px 24px; font-size: 16px;">
        <mat-icon>add_circle_outline</mat-icon> Generar nueva versión
      </button>
       <button mat-raised-button color="accent" (click)="editarPlan()" [disabled]="!selectedRow">
        <mat-icon>edit</mat-icon>Editar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .selected-row {
      background: #e3f2fd !important;
    }
    table { width: 100%; }
    td, th { cursor: pointer; }
    mat-dialog-actions { margin-top: 16px; }
  `]
})
export class VersionesPlanDialog implements AfterViewInit {
  displayedColumns = ['fechaCreacion', 'version', 'fechaInicio', 'fechaFin', 'campania', 'estado'];
  dataSource: MatTableDataSource<any>;
  selectedRow: any = null;
  isLoading = false;
  
  // Propiedades para filtros
  filtroVersion: string = '';
  filtroFechaCreacion: Date | null = null;
  datosOriginales: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private router: Router, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<VersionesPlanDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { versiones: any[] }
  ) {
    this.datosOriginales = data.versiones; // Guardar datos originales
    this.dataSource = new MatTableDataSource<any>(data.versiones); // <-- inicializa aquí
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  selectRow(row: any) {
    this.selectedRow = row;
  }

  cerrar() {
    this.dialogRef.close();
  }

  aplicarFiltros() {
    let datosFiltrados = [...this.datosOriginales];
    
    // Filtrar por versión
    if (this.filtroVersion && this.filtroVersion.trim() !== '') {
      datosFiltrados = datosFiltrados.filter(item => 
        item.version.toString().toLowerCase().includes(this.filtroVersion.toLowerCase())
      );
    }
    
    // Filtrar por fecha de creación
    if (this.filtroFechaCreacion) {
      const fechaFiltro = this.filtroFechaCreacion.toISOString().slice(0, 10);
      datosFiltrados = datosFiltrados.filter(item => 
        item.fechaCreacion === fechaFiltro
      );
    }
    
    this.dataSource.data = datosFiltrados;
  }

  limpiarFiltros() {
    this.filtroVersion = '';
    this.filtroFechaCreacion = null;
    this.dataSource.data = [...this.datosOriginales];
  }

  redirigir(row: Resultado) {
    const planData = {
      id: row.id,
      numeroPlan: row.numeroPlan,
      // version: row.version, // Temporalmente comentado
      cliente: row.cliente,
      producto: row.producto,
      campana: row.campania,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      // tipoIngresoPlan: row.tipoIngresoPlan // Temporalmente comentado
    };
    
    // Validar el tipo de plan para redirigir a la ruta correcta
    // Temporalmente deshabilitado - redirigir siempre al resumen
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Copiar plan',
        message: '¿Estás seguro que deseas copiar este plan? Se generará un nuevo número de plan.'
      }
    });
    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        const planesGuardados: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
        const original = planesGuardados.find(p => p.id === this.selectedRow!.id);
        if (!original) return;
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
          version: "1",
          fechaCreacion: new Date().toISOString().slice(0, 10) // Nueva fecha de creación
        };
        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        this.snackBar.open('Plan copiado correctamente', '', { duration: 2000 });
        this.dialogRef.close(true); // <-- Cierra el popup y notifica al padre
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
          version: nuevaVersion.toString(),
          fechaCreacion: new Date().toISOString().slice(0, 10) // Nueva fecha de creación
        };
        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        this.snackBar.open('Nueva versión creada correctamente', '', { duration: 2000 });
        this.recargarTabla(this.selectedRow!.numeroPlan);
        this.selectedRow = null; // <-- Limpia la selección después de nueva versión
      }
    }); 
  }

  editarPlan() {
    if (!this.selectedRow) return;
    this.dialogRef.close(true);
    this.router.navigate(['/plan-medios-editar', this.selectedRow.id]);
  }
   recargarTabla(id: string) {
    console.log(id);
    this.isLoading = true;
    setTimeout(() => {
      const planesGuardados: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      const versiones = planesGuardados
        .filter(p => p.numeroPlan === id)
        .map(plan => ({
          id: plan.id,
          numeroPlan: plan.numeroPlan,
          version: plan.version,
          pais: plan.paisFacturacion,
          anunciante: plan.clienteAnunciante,
          cliente: plan.clienteFueActuacion,
          marca: plan.marca,
          producto: plan.producto,
          fechaInicio: plan.fechaInicio,
          fechaFin: plan.fechaFin,
          campania: plan.campana,
          tipoIngresoPlan: plan.tipoIngresoPlan || 'Plan de Medios',
          fechaCreacion: plan.fechaCreacion || new Date().toISOString().slice(0, 10), // Incluir fecha de creación
          estado: plan.estado ?? false
        }))
        .sort((a, b) => parseInt(b.version, 10) - parseInt(a.version, 10));
        
      this.datosOriginales = versiones; // Actualizar datos originales
      this.dataSource.data = versiones;
      this.isLoading = false;
    }, 400); // Simula carga
  }


}
