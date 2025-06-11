import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

type Resultado = {
  numeroPlan: string;
  version: string;
  pais: string;
  tipoCompra: string;
  anunciante: string;
  cliente: string;
  marca: string;
  producto: string;
  fechaInicio: string;
  fechaFin: string;
  campania: string;
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
    MatCheckboxModule
  ],
  templateUrl: './plan-medios-consulta.html',
  styleUrls: ['./plan-medios-consulta.scss']
})
export class PlanMediosConsulta implements OnInit, AfterViewInit {
  // Simulación de respuesta del backend (estructura anidada)
  anunciantesBackend = [
    {
      nombre: 'Coca-Cola',
      clientes: [
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
      clientes: [
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
      clientes: [
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
  clientesOptions: string[] = [];
  marcasOptions: string[] = [];
  productosOptions: string[] = [];

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

  filteredAnunciantes!: Observable<string[]>;
  filteredClientes!: Observable<string[]>;
  filteredMarcas!: Observable<string[]>;
  filteredProductos!: Observable<string[]>;

  // Datos de ejemplo para la tabla
  resultados: Resultado[] = [
    {
      numeroPlan: '0001',
      version: '1',
      pais: 'México',
      tipoCompra: 'DIRECTO',
      anunciante: 'Nestlé',
      cliente: 'Gerber',
      marca: 'NESPRESSO',
      producto: 'NESPRESSO 1',
      fechaInicio: '2025-07-01',
      fechaFin: '2025-05-15',
      campania: 'Campaña Verano'
    },
    {
      numeroPlan: '0002',
      version: '2',
      pais: 'Perú',
      tipoCompra: 'ORION',
      anunciante: 'Unilever',
      cliente: 'Magnum',
      marca: 'HELADOS',
      producto: 'MAGNUM CLASSIC',
      fechaInicio: '2025-07-10',
      fechaFin: '2025-07-20',
      campania: 'Campaña Invierno'
    },
    {
      numeroPlan: '0003',
      version: '1',
      pais: 'Colombia',
      tipoCompra: 'KINESSO',
      anunciante: 'Colgate',
      cliente: 'Palmolive',
      marca: 'HIGIENE',
      producto: 'CREMA DENTAL',
      fechaInicio: '2025-07-01',
      fechaFin: '2025-07-31',
      campania: 'Campaña Escolar'
    },
    {
      numeroPlan: '0004',
      version: '1',
      pais: 'Chile',
      tipoCompra: 'DIRECTO',
      anunciante: 'Coca-Cola',
      cliente: 'Coca-Cola Perú',
      marca: 'Fanta',
      producto: 'Fanta Naranja',
      fechaInicio: '2025-08-01',
      fechaFin: '2025-08-15',
      campania: 'Campaña Primavera'
    },
    {
      numeroPlan: '0005',
      version: '2',
      pais: 'México',
      tipoCompra: 'ORION',
      anunciante: 'Nestlé',
      cliente: 'Nestlé Chile',
      marca: 'Milo',
      producto: 'Milo Polvo',
      fechaInicio: '2025-09-01',
      fechaFin: '2025-09-30',
      campania: 'Campaña Escolar'
    },
    {
      numeroPlan: '0006',
      version: '1',
      pais: 'Argentina',
      tipoCompra: 'KINESSO',
      anunciante: 'Unilever',
      cliente: 'Unilever Argentina',
      marca: 'Axe',
      producto: 'Axe Apollo',
      fechaInicio: '2025-10-01',
      fechaFin: '2025-10-31',
      campania: 'Campaña Otoño'
    },
    {
      numeroPlan: '0007',
      version: '1',
      pais: 'Colombia',
      tipoCompra: 'DIRECTO',
      anunciante: 'Unilever',
      cliente: 'Unilever Colombia',
      marca: 'Sedal',
      producto: 'Sedal Liso',
      fechaInicio: '2025-11-01',
      fechaFin: '2025-11-30',
      campania: 'Campaña Belleza'
    },
    {
      numeroPlan: '0008',
      version: '2',
      pais: 'Perú',
      tipoCompra: 'ORION',
      anunciante: 'Coca-Cola',
      cliente: 'Coca-Cola México',
      marca: 'Sprite',
      producto: 'Sprite Sin Azúcar',
      fechaInicio: '2025-12-01',
      fechaFin: '2025-12-31',
      campania: 'Campaña Navidad'
    },
    {
      numeroPlan: '0009',
      version: '1',
      pais: 'Chile',
      tipoCompra: 'KINESSO',
      anunciante: 'Nestlé',
      cliente: 'Nestlé Chile',
      marca: 'Nescafé',
      producto: 'Nescafé Gold',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-31',
      campania: 'Campaña Año Nuevo'
    },
    {
      numeroPlan: '0010',
      version: '1',
      pais: 'México',
      tipoCompra: 'DIRECTO',
      anunciante: 'Unilever',
      cliente: 'Unilever Argentina',
      marca: 'Rexona',
      producto: 'Rexona Women',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-02-28',
      campania: 'Campaña Verano'
    },
    {
      numeroPlan: '0011',
      version: '2',
      pais: 'Argentina',
      tipoCompra: 'ORION',
      anunciante: 'Coca-Cola',
      cliente: 'Coca-Cola Perú',
      marca: 'Coca-Cola',
      producto: 'Coca-Cola Light',
      fechaInicio: '2026-03-01',
      fechaFin: '2026-03-31',
      campania: 'Campaña Salud'
    },
    {
      numeroPlan: '0012',
      version: '1',
      pais: 'Colombia',
      tipoCompra: 'KINESSO',
      anunciante: 'Nestlé',
      cliente: 'Nestlé Chile',
      marca: 'Milo',
      producto: 'Milo Bebida',
      fechaInicio: '2026-04-01',
      fechaFin: '2026-04-30',
      campania: 'Campaña Deportes'
    }
  ];

  resultadosPaginados: Resultado[] = [];
  paginaActual = 0;
  pageSize = 10;

  minFechaFin: Date | null = null;

  // Elimina la columna 'select' de selectColumns, usa solo displayedColumns para la tabla
  displayedColumns: string[] = [
    'numeroPlan', 'version', 'pais', 'tipoCompra', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania'
  ];

  selectColumns: string[] = [ 'numeroPlan', 'version', 'pais', 'tipoCompra', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania'];

  sort: Sort = {active: '', direction: ''};

  selectedRow: any = null;
  selectedColumn: string | null = null;

  dataSource = new MatTableDataSource<Resultado>([]);
  selection = new SelectionModel<Resultado>(false, []); // solo una selección

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sortMat!: MatSort;

  columnLabels: { [key: string]: string } = {
    numeroPlan: 'Número de Plan',
    version: 'Versión',
    pais: 'País',
    tipoCompra: 'Tipo de Compra',
    anunciante: 'Anunciante',
    cliente: 'Cliente',
    marca: 'Marca',
    producto: 'Producto',
    fechaInicio: 'Fecha Inicio',
    fechaFin: 'Fecha Fin',
    campania: 'Campaña'
  };

  constructor(private router: Router) {
    // Autocomplete: Anunciante
    this.filteredAnunciantes = this.filtroForm.get('anunciante')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.anunciantesBackend.map(a => a.nombre)))
    );

    // Cuando cambia anunciante, actualizar clientes y limpiar dependientes
    this.filtroForm.get('anunciante')!.valueChanges.subscribe((anunciante: string | null) => {
      const anuncianteObj = this.anunciantesBackend.find(a => a.nombre === anunciante);
      this.clientesOptions = anuncianteObj ? anuncianteObj.clientes.map(c => c.nombre) : [];
      this.marcasOptions = [];
      this.productosOptions = [];
      this.filtroForm.get('cliente')!.setValue('');
      this.filtroForm.get('marca')!.setValue('');
      this.filtroForm.get('producto')!.setValue('');
    });

    // Autocomplete: Cliente (dependiente de anunciante)
    this.filteredClientes = this.filtroForm.get('cliente')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.clientesOptions))
    );

    // Cuando cambia cliente, actualizar marcas y limpiar dependientes
    this.filtroForm.get('cliente')!.valueChanges.subscribe((cliente: string | null) => {
      const anuncianteObj = this.anunciantesBackend.find(a => a.nombre === this.filtroForm.get('anunciante')!.value);
      const clienteObj = anuncianteObj?.clientes.find(c => c.nombre === cliente);
      this.marcasOptions = clienteObj ? clienteObj.marcas.map(m => m.nombre) : [];
      this.productosOptions = [];
      this.filtroForm.get('marca')!.setValue('');
      this.filtroForm.get('producto')!.setValue('');
    });

    // Autocomplete: Marca (dependiente de cliente)
    this.filteredMarcas = this.filtroForm.get('marca')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.marcasOptions))
    );

    // Cuando cambia marca, actualizar productos
    this.filtroForm.get('marca')!.valueChanges.subscribe((marca: string | null) => {
      const anuncianteObj = this.anunciantesBackend.find(a => a.nombre === this.filtroForm.get('anunciante')!.value);
      const clienteObj = anuncianteObj?.clientes.find(c => c.nombre === this.filtroForm.get('cliente')!.value);
      const marcaObj = clienteObj?.marcas.find(m => m.nombre === marca);
      this.productosOptions = marcaObj ? marcaObj.productos : [];
      this.filtroForm.get('producto')!.setValue('');
    });

    // Autocomplete: Producto (dependiente de marca)
    this.filteredProductos = this.filtroForm.get('producto')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.productosOptions))
    );

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

  buscar() {
    // Aquí iría la lógica para filtrar los resultados según los valores del formulario
    console.log('Filtros:', this.filtroForm.value);
  }

  borrarFiltros() {
    this.filtroForm.reset();
    this.clientesOptions = [];
    this.marcasOptions = [];
    this.productosOptions = [];
  }

  get tieneFiltrosActivos(): boolean {
    return Object.values(this.filtroForm.value).some(v => v !== null && v !== '');
  }

  ngOnInit() {
    // Inicializa dataSource con todos los resultados (puedes filtrar si lo deseas)
    this.dataSource = new MatTableDataSource<Resultado>(this.resultados);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sortMat;
  }

  sortData(sort: Sort) {
    // Ya no necesitas lógica aquí, MatTableDataSource maneja el ordenamiento automáticamente
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

  // Llama esto desde el template al hacer click en un th
  selectColumn(column: string) {
    this.selectedColumn = column;
  }

  onRowDoubleClick(row: Resultado) {
    this.selectedRow = row;
    const planData = {
      numeroPlan: row.numeroPlan,
      version: row.version,
      cliente: row.cliente,
      producto: row.producto,
      campana: row.campania,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin
    };
    
    this.router.navigate(['/plan-medios-resumen'], { 
      state: { planData } 
    });
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }
}
