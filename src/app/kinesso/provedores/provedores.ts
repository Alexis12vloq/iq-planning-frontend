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
import * as XLSX from 'xlsx';

// Importa el JSON de provedores mockeado
import PROVEDORES_MOCK from './provedores-mock.json';

interface Proveedor {
  id: string;
  VENDOR_MEDIUM: string;
  VENDOR_GROUP: string;
  MEDIUMS: string;
  VENDOR: string;
  TIPO_VENDOR: string;
  ORION_BENEFICIO_REAL_VENDOR: number;
  DIRECTO_TRADICIONAL_MVSS: number;
  KINESSO_POWER: number;
  KINESSO_GLASS: number;
  NOTAS_KSO: string;
  DUO_GLASS: number;
  DUO_POWER: number;
  ESTADO: number;
}

@Component({
  selector: 'app-provedores',
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
  templateUrl: './provedores.html',
  styleUrl: './provedores.scss'
})
export class Provedores implements OnInit {
  proveedorForm = new FormGroup({
    VENDOR_MEDIUM: new FormControl('', Validators.required),
    VENDOR_GROUP: new FormControl('', Validators.required),
    MEDIUMS: new FormControl('', Validators.required),
    VENDOR: new FormControl('', Validators.required),
    TIPO_VENDOR: new FormControl('', Validators.required),
    ORION_BENEFICIO_REAL_VENDOR: new FormControl(0, Validators.required),
    DIRECTO_TRADICIONAL_MVSS: new FormControl(0, Validators.required),
    KINESSO_POWER: new FormControl(0, Validators.required),
    KINESSO_GLASS: new FormControl(0, Validators.required),
    NOTAS_KSO: new FormControl(''),
    DUO_GLASS: new FormControl(0, Validators.required),
    DUO_POWER: new FormControl(0, Validators.required),
    ESTADO: new FormControl(1, Validators.required)
  });

  tipoVendorOptions = ['REGULAR', 'PREMIUM', 'IMPORTANTE', 'LONGTAIL'];
  estadoOptions = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' }
  ];

  provedores: Proveedor[] = [];
  filteredProvedores: Proveedor[] = [];
  filterVendor = '';

  editMode = false;
  editingId: string | null = null;

  displayedColumns: string[] = [
    'VENDOR_MEDIUM',
    'VENDOR_GROUP',
    'MEDIUMS',
    'VENDOR',
    'TIPO_VENDOR',
    'ORION_BENEFICIO_REAL_VENDOR',
    'DIRECTO_TRADICIONAL_MVSS',
    'KINESSO_POWER',
    'KINESSO_GLASS',
    'NOTAS_KSO',
    'DUO_GLASS',
    'DUO_POWER',
    'ESTADO'
  ];

  columnLabels: { [key: string]: string } = {
    VENDOR_MEDIUM: 'Vendor Medium',
    VENDOR_GROUP: 'Vendor Group',
    MEDIUMS: 'Mediums',
    VENDOR: 'Vendor',
    TIPO_VENDOR: 'Tipo Vendor',
    ORION_BENEFICIO_REAL_VENDOR: 'Orion Beneficio Real Vendor',
    DIRECTO_TRADICIONAL_MVSS: 'Directo Tradicional MVSs',
    KINESSO_POWER: 'Kinesso Power',
    KINESSO_GLASS: 'Kinesso Glass',
    NOTAS_KSO: 'Notas KSO',
    DUO_GLASS: 'Duo Glass',
    DUO_POWER: 'Duo Power',
    ESTADO: 'Estado'
  };

  dataSource: any;
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {
    // Si no hay datos en localStorage, inicializa con el mock completo
    if (!localStorage.getItem('provedoresKinesso')) {
      const provedoresJson = PROVEDORES_MOCK.map((p: any) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        VENDOR_MEDIUM: p.VENDOR_MEDIUM,
        VENDOR_GROUP: p.VENDOR_GROUP,
        MEDIUMS: p.MEDIUMS,
        VENDOR: p.VENDOR,
        TIPO_VENDOR: p.TIPO_VENDOR,
        ORION_BENEFICIO_REAL_VENDOR: p.ORION_BENEFICIO_REAL_VENDOR,
        DIRECTO_TRADICIONAL_MVSS: p.DIRECTO_TRADICIONAL_MVSS,
        KINESSO_POWER: p.KINESSO_POWER,
        KINESSO_GLASS: p.KINESSO_GLASS,
        NOTAS_KSO: p.NOTAS_KSO,
        DUO_GLASS: p.DUO_GLASS,
        DUO_POWER: p.DUO_POWER,
        ESTADO: p.ESTADO
      }));
      localStorage.setItem('provedoresKinesso', JSON.stringify(provedoresJson));
    }
    this.loadProvedores();
    this.filteredProvedores = [...this.provedores];
    this.dataSource = new MatTableDataSource(this.filteredProvedores);
    this.dataSource.paginator = this.paginator;
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadProvedores() {
    const data = localStorage.getItem('provedoresKinesso');
    if (data) {
      this.provedores = JSON.parse(data).map((p: any) => ({
        id: p.id,
        VENDOR_MEDIUM: p.VENDOR_MEDIUM ?? '',
        VENDOR_GROUP: p.VENDOR_GROUP ?? '',
        MEDIUMS: p.MEDIUMS ?? '',
        VENDOR: p.VENDOR ?? '',
        TIPO_VENDOR: p.TIPO_VENDOR ?? '',
        ORION_BENEFICIO_REAL_VENDOR: p.ORION_BENEFICIO_REAL_VENDOR ?? 0,
        DIRECTO_TRADICIONAL_MVSS: p.DIRECTO_TRADICIONAL_MVSS ?? 0,
        KINESSO_POWER: p.KINESSO_POWER ?? 0,
        KINESSO_GLASS: p.KINESSO_GLASS ?? 0,
        NOTAS_KSO: p.NOTAS_KSO ?? '',
        DUO_GLASS: p.DUO_GLASS ?? 0,
        DUO_POWER: p.DUO_POWER ?? 0,
        ESTADO: p.ESTADO ?? 1
      }));
    } else {
      this.provedores = [];
    }
  }

  saveProvedores() {
    localStorage.setItem('provedoresKinesso', JSON.stringify(this.provedores));
    this.filteredProvedores = this.getFilteredProvedores();
    if (this.dataSource) {
      this.dataSource.data = this.filteredProvedores;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  onSubmit() {
    if (this.proveedorForm.valid) {
      const newVendor = (this.proveedorForm.value.VENDOR ?? '').trim().toLowerCase();
      // Validar que no exista un vendor igual (ignorando mayúsculas/minúsculas y espacios)
      const exists = this.provedores.some(
        p => (p.VENDOR ?? '').trim().toLowerCase() === newVendor
      );
      if (!this.editMode && exists) {
        this.snackBar.open('Ya existe un proveedor con ese Vendor', '', { duration: 2500 });
        return;
      }

      this.snackBar.open('Guardando proveedor...', '', { duration: 1200 });

      const formValue = {
        VENDOR_MEDIUM: this.proveedorForm.value.VENDOR_MEDIUM ?? '',
        VENDOR_GROUP: this.proveedorForm.value.VENDOR_GROUP ?? '',
        MEDIUMS: this.proveedorForm.value.MEDIUMS ?? '',
        VENDOR: this.proveedorForm.value.VENDOR ?? '',
        TIPO_VENDOR: this.proveedorForm.value.TIPO_VENDOR ?? '',
        ORION_BENEFICIO_REAL_VENDOR: Number(this.proveedorForm.value.ORION_BENEFICIO_REAL_VENDOR),
        DIRECTO_TRADICIONAL_MVSS: Number(this.proveedorForm.value.DIRECTO_TRADICIONAL_MVSS),
        KINESSO_POWER: Number(this.proveedorForm.value.KINESSO_POWER),
        KINESSO_GLASS: Number(this.proveedorForm.value.KINESSO_GLASS),
        NOTAS_KSO: this.proveedorForm.value.NOTAS_KSO ?? '',
        DUO_GLASS: Number(this.proveedorForm.value.DUO_GLASS),
        DUO_POWER: Number(this.proveedorForm.value.DUO_POWER),
        ESTADO: Number(this.proveedorForm.value.ESTADO)
      };

      if (this.editMode && this.editingId) {
        // Editar existente
        const idx = this.provedores.findIndex(p => p.id === this.editingId);
        if (idx > -1) {
          this.provedores[idx] = { id: this.editingId, ...formValue };
        }
        this.editMode = false;
        this.editingId = null;
      } else {
        // Nuevo
        const nuevo = {
          id: Date.now().toString(),
          ...formValue
        };
        this.provedores.push(nuevo as Proveedor);
      }
      this.saveProvedores();

      // Limpia el formulario y los estados de validación
      this.proveedorForm.reset({
        VENDOR_MEDIUM: '',
        VENDOR_GROUP: '',
        MEDIUMS: '',
        VENDOR: '',
        TIPO_VENDOR: '',
        ORION_BENEFICIO_REAL_VENDOR: 0,
        DIRECTO_TRADICIONAL_MVSS: 0,
        KINESSO_POWER: 0,
        KINESSO_GLASS: 0,
        NOTAS_KSO: '',
        DUO_GLASS: 0,
        DUO_POWER: 0,
        ESTADO: 1
      });
      this.proveedorForm.markAsPristine();
      this.proveedorForm.markAsUntouched();
      Object.values(this.proveedorForm.controls).forEach(control => {
        control.setErrors(null);
      });

      setTimeout(() => {
        this.snackBar.open('Proveedor guardado correctamente', '', { duration: 2000 });
      }, 1200);
    }
  }

  onRowDblClick(proveedor: any) {
    this.editMode = true;
    this.editingId = proveedor.id;
    this.proveedorForm.setValue({
      VENDOR_MEDIUM: proveedor.VENDOR_MEDIUM,
      VENDOR_GROUP: proveedor.VENDOR_GROUP,
      MEDIUMS: proveedor.MEDIUMS,
      VENDOR: proveedor.VENDOR,
      TIPO_VENDOR: proveedor.TIPO_VENDOR,
      ORION_BENEFICIO_REAL_VENDOR: proveedor.ORION_BENEFICIO_REAL_VENDOR,
      DIRECTO_TRADICIONAL_MVSS: proveedor.DIRECTO_TRADICIONAL_MVSS,
      KINESSO_POWER: proveedor.KINESSO_POWER,
      KINESSO_GLASS: proveedor.KINESSO_GLASS,
      NOTAS_KSO: proveedor.NOTAS_KSO,
      DUO_GLASS: proveedor.DUO_GLASS,
      DUO_POWER: proveedor.DUO_POWER,
      ESTADO: proveedor.ESTADO
    });
  }

  cancelarEdicion() {
    this.editMode = false;
    this.editingId = null;
    this.proveedorForm.reset({ ESTADO: 1 });
    // Habilita el campo VENDOR al cancelar edición
    this.proveedorForm.get('VENDOR')?.enable();
  }

  onFilterChange() {
    this.filteredProvedores = this.getFilteredProvedores();
    if (this.dataSource) {
      this.dataSource.data = this.filteredProvedores;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  getFilteredProvedores(): Proveedor[] {
    if (!this.filterVendor.trim()) return [...this.provedores];
    return this.provedores.filter(p =>
      (p.VENDOR ?? '').toLowerCase().includes(this.filterVendor.trim().toLowerCase())
    );
  }

  onVendorInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterVendor = input.value;
    this.onFilterChange();
  }

  getDisplayValue(row: any, column: string): string {
    if (column === 'ESTADO') {
      return row.ESTADO === 1 ? 'Activo' : 'Inactivo';
    }
    return row[column];
  }

  onExcelUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Mapea los datos del Excel a la estructura esperada
      const nuevos = json.map((p: any) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        VENDOR_MEDIUM: p.VENDOR_MEDIUM ?? '',
        VENDOR_GROUP: p.VENDOR_GROUP ?? '',
        MEDIUMS: p.MEDIUMS ?? '',
        VENDOR: p.VENDOR ?? '',
        TIPO_VENDOR: p.TIPO_VENDOR ?? '',
        ORION_BENEFICIO_REAL_VENDOR: Number(p.ORION_BENEFICIO_REAL_VENDOR ?? 0),
        DIRECTO_TRADICIONAL_MVSS: Number(p.DIRECTO_TRADICIONAL_MVSS ?? 0),
        KINESSO_POWER: Number(p.KINESSO_POWER ?? 0),
        KINESSO_GLASS: Number(p.KINESSO_GLASS ?? 0),
        NOTAS_KSO: p.NOTAS_KSO ?? '',
        DUO_GLASS: Number(p.DUO_GLASS ?? 0),
        DUO_POWER: Number(p.DUO_POWER ?? 0),
        ESTADO: Number(p.ESTADO ?? 1)
      }));

      // Evita duplicados por VENDOR
      const vendorSet = new Set(this.provedores.map(p => (p.VENDOR ?? '').trim().toLowerCase()));
      const filtrados = nuevos.filter(n => !vendorSet.has((n.VENDOR ?? '').trim().toLowerCase()));
      this.provedores = [...this.provedores, ...filtrados];
      this.saveProvedores();
      this.snackBar.open('Proveedores importados correctamente', '', { duration: 2000 });
    };
    reader.readAsArrayBuffer(file);
    // Limpia el input para permitir subir el mismo archivo de nuevo si se desea
    event.target.value = '';
  }

  descargarExcel() {
    // Exporta los datos actuales de la tabla
    const data = this.filteredProvedores.length ? this.filteredProvedores : this.provedores;
    const exportData = data.map(p => ({
      VENDOR_MEDIUM: p.VENDOR_MEDIUM,
      VENDOR_GROUP: p.VENDOR_GROUP,
      MEDIUMS: p.MEDIUMS,
      VENDOR: p.VENDOR,
      TIPO_VENDOR: p.TIPO_VENDOR,
      ORION_BENEFICIO_REAL_VENDOR: p.ORION_BENEFICIO_REAL_VENDOR,
      DIRECTO_TRADICIONAL_MVSS: p.DIRECTO_TRADICIONAL_MVSS,
      KINESSO_POWER: p.KINESSO_POWER,
      KINESSO_GLASS: p.KINESSO_GLASS,
      NOTAS_KSO: p.NOTAS_KSO,
      DUO_GLASS: p.DUO_GLASS,
      DUO_POWER: p.DUO_POWER,
      ESTADO: p.ESTADO
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, 'provedores_kinesso.xlsx');
  }
}
