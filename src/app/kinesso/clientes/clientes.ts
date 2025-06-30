import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Importa el JSON de clientes mockeado
import CLIENTES_MOCK from './clientes-mock.json';

interface Cliente {
  id: string;
  ADVERTISER: string;
  DIRECTO: number;
  ORION: number;
  KINESSO: number;
  KINESSO_TYPE: string;
  DUO: number;
  AVAILABLE_DSP_EQUATIVE: string;
  NOTAS_1: string;
  AVALIABLE_DEALS_CURADOS: string;
  NOTAS_2: string;
  ESTADO: number;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit {
  clienteForm = new FormGroup({
    ADVERTISER: new FormControl('', Validators.required),
    DIRECTO: new FormControl('', Validators.required), // string para select
    ORION: new FormControl('', Validators.required),
    KINESSO: new FormControl('', Validators.required),
    KINESSO_TYPE: new FormControl('', Validators.required),
    DUO: new FormControl('', Validators.required),
    AVAILABLE_DSP_EQUATIVE: new FormControl(''),
    NOTAS_1: new FormControl(''),
    AVALIABLE_DEALS_CURADOS: new FormControl(''),
    NOTAS_2: new FormControl(''),
    ESTADO: new FormControl(1, Validators.required)
  });

  // Opciones para combos
  tipoKinessoOptions = ['POWERBOX', 'GLASS', 'NA'];
  booleanOptions = [
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' }
  ];
  estadoOptions = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' }
  ];

  clientes: Cliente[] = [];
  filteredClientes: Cliente[] = [];
  filterAdvertiser = '';

  editMode = false;
  editingId: string | null = null;

  // Cambia displayedColumns a un array de strings con los campos reales de la tabla de clientes
  displayedColumns: string[] = [
    'advertiser',
    'directo',
    'orion',
    'kinesso',
    'kinesso_type',
    'duo',
    'available_dsp_equative',
    'notas_1',
    'avaliable_deals_curados',
    'notas_2',
    'estado'
  ];

  columnLabels: { [key: string]: string } = {
    advertiser: 'Advertiser',
    directo: 'Directo',
    orion: 'Orion',
    kinesso: 'Kinesso',
    kinesso_type: 'Kinesso Type',
    duo: 'Duo',
    available_dsp_equative: 'Available DSP Equative',
    notas_1: 'Notas 1',
    avaliable_deals_curados: 'Available Deals Curados',
    notas_2: 'Notas 2',
    estado: 'Estado'
  };

  // DataSource y referencias para paginador y sort
  dataSource: any;
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {
    // Si no hay datos en localStorage, inicializa con el mock completo
    if (!localStorage.getItem('clientesKinesso')) {
      const clientesJson = CLIENTES_MOCK.map((c: any) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        advertiser: c.ADVERTISER,
        directo: c.DIRECTO,
        orion: c.ORION,
        kinesso: c.KINESSO,
        kinesso_type: c.KINESSO_TYPE,
        duo: c.DUO,
        available_dsp_equative: c.AVAILABLE_DSP_EQUATIVE,
        notas_1: c.NOTAS_1,
        avaliable_deals_curados: c.AVALIABLE_DEALS_CURADOS,
        notas_2: c.NOTAS_2,
        estado: c.ESTADO,
        // Para compatibilidad con la interfaz Cliente
        ADVERTISER: c.ADVERTISER,
        DIRECTO: c.DIRECTO,
        ORION: c.ORION,
        KINESSO: c.KINESSO,
        KINESSO_TYPE: c.KINESSO_TYPE,
        DUO: c.DUO,
        AVAILABLE_DSP_EQUATIVE: c.AVAILABLE_DSP_EQUATIVE,
        NOTAS_1: c.NOTAS_1,
        AVALIABLE_DEALS_CURADOS: c.AVALIABLE_DEALS_CURADOS,
        NOTAS_2: c.NOTAS_2,
        ESTADO: c.ESTADO
      }));
      localStorage.setItem('clientesKinesso', JSON.stringify(clientesJson));
    }
    this.loadClientes();
    this.filteredClientes = [...this.clientes];
    this.dataSource = new MatTableDataSource(this.filteredClientes);
    this.dataSource.paginator = this.paginator;
  }

  ngAfterViewInit() {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
  }

  loadClientes() {
    const data = localStorage.getItem('clientesKinesso');
    if (data) {
      this.clientes = JSON.parse(data).map((c: any) => ({
        id: c.id,
        advertiser: c.advertiser ?? c.ADVERTISER ?? '',
        directo: c.directo ?? c.DIRECTO ?? 0,
        orion: c.orion ?? c.ORION ?? 0,
        kinesso: c.kinesso ?? c.KINESSO ?? 0,
        kinesso_type: c.kinesso_type ?? c.KINESSO_TYPE ?? '',
        duo: c.duo ?? c.DUO ?? 0,
        available_dsp_equative: c.available_dsp_equative ?? c.AVAILABLE_DSP_EQUATIVE ?? '',
        notas_1: c.notas_1 ?? c.NOTAS_1 ?? '',
        avaliable_deals_curados: c.avaliable_deals_curados ?? c.AVALIABLE_DEALS_CURADOS ?? '',
        notas_2: c.notas_2 ?? c.NOTAS_2 ?? '',
        estado: c.estado ?? c.ESTADO ?? 1,
        // Para compatibilidad con la interfaz Cliente
        ADVERTISER: c.advertiser ?? c.ADVERTISER ?? '',
        DIRECTO: c.directo ?? c.DIRECTO ?? 0,
        ORION: c.orion ?? c.ORION ?? 0,
        KINESSO: c.kinesso ?? c.KINESSO ?? 0,
        KINESSO_TYPE: c.kinesso_type ?? c.KINESSO_TYPE ?? '',
        DUO: c.duo ?? c.DUO ?? 0,
        AVAILABLE_DSP_EQUATIVE: c.available_dsp_equative ?? c.AVAILABLE_DSP_EQUATIVE ?? '',
        NOTAS_1: c.notas_1 ?? c.NOTAS_1 ?? '',
        AVALIABLE_DEALS_CURADOS: c.avaliable_deals_curados ?? c.AVALIABLE_DEALS_CURADOS ?? '',
        NOTAS_2: c.notas_2 ?? c.NOTAS_2 ?? '',
        ESTADO: c.estado ?? c.ESTADO ?? 1
      }));
    } else {
      this.clientes = [];
    }
  }

  
  saveClientes() {
    localStorage.setItem('clientesKinesso', JSON.stringify(this.clientes));
    this.filteredClientes = this.getFilteredClientes();
    if (this.dataSource) {
      this.dataSource.data = this.filteredClientes;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  onSubmit() {
    if (this.clienteForm.valid) {
      const newAdvertiser = (this.clienteForm.value.ADVERTISER ?? '').trim().toLowerCase();
      // Validar que no exista un advertiser igual (ignorando mayúsculas/minúsculas y espacios)
      const exists = this.clientes.some(
        c => (c.ADVERTISER ?? '').trim().toLowerCase() === newAdvertiser
      );
      if (!this.editMode && exists) {
        this.snackBar.open('Ya existe un cliente con ese Advertiser', '', { duration: 2500 });
        return;
      }

      this.snackBar.open('Guardando cliente...', '', { duration: 1200 });

      // Homogeneizar los campos a minúsculas para la tabla y storage
      const formValue = {
        advertiser: this.clienteForm.value.ADVERTISER ?? '',
        directo: Number(this.clienteForm.value.DIRECTO),
        orion: Number(this.clienteForm.value.ORION),
        kinesso: Number(this.clienteForm.value.KINESSO),
        kinesso_type: this.clienteForm.value.KINESSO_TYPE ?? '',
        duo: Number(this.clienteForm.value.DUO),
        available_dsp_equative: this.clienteForm.value.AVAILABLE_DSP_EQUATIVE ?? '',
        notas_1: this.clienteForm.value.NOTAS_1 ?? '',
        avaliable_deals_curados: this.clienteForm.value.AVALIABLE_DEALS_CURADOS ?? '',
        notas_2: this.clienteForm.value.NOTAS_2 ?? '',
        estado: Number(this.clienteForm.value.ESTADO),
        // Para compatibilidad con la interfaz Cliente
        ADVERTISER: this.clienteForm.value.ADVERTISER ?? '',
        DIRECTO: Number(this.clienteForm.value.DIRECTO),
        ORION: Number(this.clienteForm.value.ORION),
        KINESSO: Number(this.clienteForm.value.KINESSO),
        KINESSO_TYPE: this.clienteForm.value.KINESSO_TYPE ?? '',
        DUO: Number(this.clienteForm.value.DUO),
        AVAILABLE_DSP_EQUATIVE: this.clienteForm.value.AVAILABLE_DSP_EQUATIVE ?? '',
        NOTAS_1: this.clienteForm.value.NOTAS_1 ?? '',
        AVALIABLE_DEALS_CURADOS: this.clienteForm.value.AVALIABLE_DEALS_CURADOS ?? '',
        NOTAS_2: this.clienteForm.value.NOTAS_2 ?? '',
        ESTADO: Number(this.clienteForm.value.ESTADO)
      };

      if (this.editMode && this.editingId) {
        // Editar existente
        const idx = this.clientes.findIndex(c => c.id === this.editingId);
        if (idx > -1) {
          this.clientes[idx] = { id: this.editingId, ...formValue };
        }
        this.editMode = false;
        this.editingId = null;
      } else {
        // Nuevo
        const nuevo = {
          id: Date.now().toString(),
          ...formValue
        };
        this.clientes.push(nuevo as Cliente);
      }
      this.saveClientes();

      // Limpia el formulario y los estados de validación para evitar que los campos se pongan en rojo
      this.clienteForm.reset({ 
        ADVERTISER: '', 
        DIRECTO: '', 
        ORION: '', 
        KINESSO: '', 
        KINESSO_TYPE: '', 
        DUO: '', 
        AVAILABLE_DSP_EQUATIVE: '', 
        NOTAS_1: '', 
        AVALIABLE_DEALS_CURADOS: '', 
        NOTAS_2: '', 
        ESTADO: 1 
      });
      this.clienteForm.markAsPristine();
      this.clienteForm.markAsUntouched();
      Object.values(this.clienteForm.controls).forEach(control => {
        control.setErrors(null);
      });

      setTimeout(() => {
        this.snackBar.open('Cliente guardado correctamente', '', { duration: 2000 });
      }, 1200);
    }
  }

  onRowDblClick(cliente: any) {
    this.editMode = true;
    this.editingId = cliente.id;
    this.clienteForm.setValue({
      ADVERTISER: cliente.advertiser,
      DIRECTO: cliente.directo.toString(),
      ORION: cliente.orion.toString(),
      KINESSO: cliente.kinesso.toString(),
      KINESSO_TYPE: cliente.kinesso_type,
      DUO: cliente.duo.toString(),
      AVAILABLE_DSP_EQUATIVE: cliente.available_dsp_equative,
      NOTAS_1: cliente.notas_1,
      AVALIABLE_DEALS_CURADOS: cliente.avaliable_deals_curados,
      NOTAS_2: cliente.notas_2,
      ESTADO: cliente.estado
    });
    // Deshabilita el campo ADVERTISER al editar
    this.clienteForm.get('ADVERTISER')?.disable();
  }

  cancelarEdicion() {
    this.editMode = false;
    this.editingId = null;
    this.clienteForm.reset({ ESTADO: 1 });
    // Habilita el campo ADVERTISER al cancelar edición
    this.clienteForm.get('ADVERTISER')?.enable();
  }

  onFilterChange() {
    this.filteredClientes = this.getFilteredClientes();
    if (this.dataSource) {
      this.dataSource.data = this.filteredClientes;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  getFilteredClientes(): Cliente[] {
    if (!this.filterAdvertiser.trim()) return [...this.clientes];
    return this.clientes.filter(c =>
      c.ADVERTISER.toLowerCase().includes(this.filterAdvertiser.trim().toLowerCase())
    );
  }

  isFormValid() {
    return this.clienteForm.valid;
  }

  onAdvertiserInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterAdvertiser = input.value;
    this.onFilterChange();
  }

  // Cambia el valor mostrado en la tabla para los campos booleanos y estado
  getDisplayValue(row: any, column: string): string {
    if (['directo', 'orion', 'kinesso', 'duo'].includes(column)) {
      return row[column] === 1 ? 'Sí' : 'No';
    }
    if (column === 'estado') {
      return row.estado === 1 ? 'Activo' : 'Inactivo';
    }
    return row[column];
  }
}
