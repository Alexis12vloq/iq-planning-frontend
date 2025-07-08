import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { PlanMediosLocal } from '../models/plan-medios-local.model';
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
  tipoIngresoPlan: string;
  tarifa: number;
  estado: boolean;
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
  resultados: Resultado[] = [];

  displayedColumns: string[] = [
    'numeroPlan', 'version', 'pais', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania', 'tipoIngresoPlan', 'tarifa', 'estado'
  ];

  selectColumns: string[] = [
    'numeroPlan', 'version', 'pais', 'anunciante', 'cliente', 'marca', 'producto', 'fechaInicio', 'fechaFin', 'campania', 'tipoIngresoPlan', 'tarifa', 'estado'
  ];

  sort: Sort = {active: '', direction: ''};
  selectedRow: Resultado | null = null;
  selectedColumn: string | null = null;

  dataSource = new MatTableDataSource<Resultado>([]);
  selection = new SelectionModel<Resultado>(false, []);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sortMat!: MatSort;

  minFechaFin: Date | null = null; // <-- agrega esta propiedad

  allResultados: Resultado[] = []; // almacena todos los resultados para filtrar

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
    campania: 'Campaña',
    tipoIngresoPlan: 'Tipo de Ingreso',
    tarifa: 'Tarifa',
    estado: 'Estado'
  };

  isLoading = false;

  constructor(private router: Router, private dialog: MatDialog, private snackBar: MatSnackBar) {
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
    this.isLoading = true;
    setTimeout(() => {
      // Filtra la data según los valores del formulario
      const filtros = this.filtroForm.value;
      let filtrados = this.allResultados;

      if (filtros.numeroPlan) {
        filtrados = filtrados.filter(r => r.numeroPlan.includes(filtros.numeroPlan as string));
      }
      if (filtros.version) {
        filtrados = filtrados.filter(r => r.version.includes(filtros.version as string));
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

      // Al final, asegúrate de mostrar solo la última versión por número de plan
      filtrados = this.filtrarUltimaVersionPorNumeroPlan(filtrados);
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
    this.clientesOptions = [];
    this.marcasOptions = [];
    this.productosOptions = [];
    this.dataSource.data = this.allResultados; // restablece la tabla al quitar filtros
  }

  get tieneFiltrosActivos(): boolean {
    return Object.values(this.filtroForm.value).some(v => v !== null && v !== '');
  }

  ngOnInit() {
    this.isLoading = true;
    setTimeout(() => {
      // Cargar planes guardados en localStorage
      const planesLocal: PlanMediosLocal[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      const planesLocalAsResultados = planesLocal.map(plan => ({
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
        tarifa: plan.tarifa || 0,
        estado: plan.estado ?? false // si no existe, por defecto false
      }));
      // Solo la última versión por número de plan
      this.allResultados = this.filtrarUltimaVersionPorNumeroPlan(planesLocalAsResultados);
      this.dataSource = new MatTableDataSource<Resultado>(this.allResultados);
      this.isLoading = false;
    }, 400); // Simula carga
  }

  ngAfterViewInit() {
    this.isLoading = true;
    setTimeout(() => {
      // Ordena los registros por id (timestamp) descendente: más reciente primero
      this.dataSource.data = [...this.dataSource.data].sort((a, b) => Number(b.id) - Number(a.id));
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sortMat;
      this.isLoading = false;
    }, 400); // Simula carga
  }

  sortData(sort: Sort) {
    // No es necesario implementar nada aquí, MatTableDataSource maneja el ordenamiento automáticamente
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

  selectColumn(column: string) {
    this.selectedColumn = column;
  }

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
        tarifa: plan.tarifa || 0,
        estado: plan.estado ?? false
      }))
      .sort((a, b) => parseInt(b.version, 10) - parseInt(a.version, 10));

    const dialogRef = this.dialog.open(VersionesPlanDialog, {
      width: '1200px',
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
    if (typeof value === 'boolean') {
      return value ? 'Aprobado' : 'Sin aprobar';
    }
    if (typeof value === 'number') {
      if (column === 'tarifa') {
        return value === 0 ? '-' : value.toFixed(2);
      }
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
    this.isLoading = true;
    setTimeout(() => {
      const planesLocal: any[] = JSON.parse(localStorage.getItem('planesMedios') || '[]');
      const planesLocalAsResultados = planesLocal.map(plan => ({
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
        tarifa: plan.tarifa || 0,
        estado: plan.estado ?? false // si no existe, por defecto false
      }));
      // Solo la última versión por número de plan
      this.allResultados = this.filtrarUltimaVersionPorNumeroPlan(planesLocalAsResultados).sort((a, b) => Number(b.id) - Number(a.id));
      this.dataSource.data = this.allResultados;
      this.isLoading = false;
    }, 400); // Simula carga
  }

  editarPlan() {
    if (!this.selectedRow) return;
    this.router.navigate(['/plan-medios-editar', this.selectedRow.id]);
  }

  // Añade esta función utilitaria:
  private filtrarUltimaVersionPorNumeroPlan(resultados: Resultado[]): Resultado[] {
    const map = new Map<string, Resultado>();
    for (const r of resultados) {
      const numPlan = r.numeroPlan;
      const versionNum = parseInt(r.version, 10);
      if (!map.has(numPlan) || versionNum > parseInt(map.get(numPlan)!.version, 10)) {
        map.set(numPlan, r);
      }
    }
    return Array.from(map.values());
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
    MatIconModule
  ],
  template: `
      <h2 mat-dialog-title 
          style="font-family: 'Montserrat', 'Roboto', Arial, sans-serif; font-size:1.5rem; font-weight:700; color:#3c5977; letter-spacing:1px; text-transform:uppercase; margin-bottom:0; display: flex; justify-content: space-between; align-items: center;">
        
        <span>
          Versiones del Plan {{ data.versiones[0]?.numeroPlan || '' }}
        </span>

        <button mat-icon-button  (click)="cerrar()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

    <mat-dialog-content style="max-width: 1000px;">
      <div style="overflow-x:auto; margin-bottom:24px;">
        <div class="mat-elevation-z8">
          <table mat-table [dataSource]="dataSource" matSort class="mat-elevation-z8" style="width:100%;">
            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Versión</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)">
                {{ row.version }}
              </td>
            </ng-container>
            <ng-container matColumnDef="fechaInicio">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha Inicio</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)">
                {{ row.fechaInicio }}
              </td>
            </ng-container>
            <ng-container matColumnDef="fechaFin">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha Fin</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)">
                {{ row.fechaFin }}
              </td>
            </ng-container>
            <ng-container matColumnDef="campania">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Campaña</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)">
                {{ row.campania }}
              </td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Estado</th>
              <td mat-cell *matCellDef="let row" (dblclick)="redirigir(row)" [class.selected-row]="selectedRow === row" (click)="selectRow(row)">
                {{ row.estado ? 'Aprobado' : 'Sin aprobar' }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.selected-row]="selectedRow === row" (click)="selectRow(row)" (dblclick)="redirigir(row)"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons aria-label="Select page"></mat-paginator>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="center" style="display:flex; flex-direction:row; gap:25px;">
      <button mat-raised-button color="primary" (click)="copiarPlan()" [disabled]="!selectedRow">
        <mat-icon>content_copy</mat-icon> Copiar plan
      </button>
      <button mat-raised-button color="accent" (click)="nuevaVersion()" [disabled]="!selectedRow">
        <mat-icon>add_circle_outline</mat-icon> Generar nueva versión
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
  displayedColumns = ['version', 'fechaInicio', 'fechaFin', 'campania', 'estado'];
  dataSource: MatTableDataSource<any>;
  selectedRow: any = null;
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private router: Router, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<VersionesPlanDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { versiones: any[] }
  ) {
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

  redirigir(row: Resultado) {
    const planData = {
      id: row.id,
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
          version: "1"
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
          version: nuevaVersion.toString()
        };
        planesGuardados.push(nuevoPlan);
        localStorage.setItem('planesMedios', JSON.stringify(planesGuardados));
        this.snackBar.open('Nueva versión creada correctamente', '', { duration: 2000 });
        this.recargarTabla(this.selectedRow!.numeroPlan);
        this.selectedRow = null; // <-- Limpia la selección después de nueva versión
      }
    }); 
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
          estado: plan.estado ?? false
        }))
        .sort((a, b) => parseInt(b.version, 10) - parseInt(a.version, 10));
        
      
      this.dataSource.data = versiones;
      this.isLoading = false;
    }, 400); // Simula carga
  }


}
