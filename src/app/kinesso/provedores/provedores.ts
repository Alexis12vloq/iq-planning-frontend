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

interface Proveedor {
  id: string;
  vendor_medium: string;
  vendor_group: string;
  mediums: string;
  vendor: string;
  tipo_vendor: string;
  orion_beneficio_real_vendor: number;
  directo_tradicional_mvss: number;
  kinesso_power: number;
  kinesso_glass: number;
  notas_kso: string;
  duo_glass: number;
  duo_power: number;
  estado: number;
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
    vendor_medium: new FormControl('', Validators.required),
    vendor_group: new FormControl('', Validators.required),
    mediums: new FormControl('', Validators.required),
    vendor: new FormControl('', Validators.required),
    tipo_vendor: new FormControl('', Validators.required),
    orion_beneficio_real_vendor: new FormControl(0, Validators.required),
    directo_tradicional_mvss: new FormControl(0, Validators.required),
    kinesso_power: new FormControl(0, Validators.required),
    kinesso_glass: new FormControl(0, Validators.required),
    notas_kso: new FormControl(''),
    duo_glass: new FormControl(0, Validators.required),
    duo_power: new FormControl(0, Validators.required),
    estado: new FormControl(1, Validators.required)
  });

  tipoVendorOptions = ['REGULAR', 'PREMIUM', 'IMPORTANTE', 'LONGTAIL'];
  estadoOptions = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' }
  ];

  proveedores: Proveedor[] = [];
  filteredProveedores: Proveedor[] = [];
  filterVendor = '';

  editMode = false;
  editingId: string | null = null;

  displayedColumns: string[] = [
    'vendor_medium',
    'vendor_group',
    'mediums',
    'vendor',
    'tipo_vendor',
    'orion_beneficio_real_vendor',
    'directo_tradicional_mvss',
    'kinesso_power',
    'kinesso_glass',
    'notas_kso',
    'duo_glass',
    'duo_power',
    'estado'
  ];

  columnLabels: { [key: string]: string } = {
    vendor_medium: 'Vendor Medium',
    vendor_group: 'Vendor Group',
    mediums: 'Mediums',
    vendor: 'Vendor',
    tipo_vendor: 'Tipo Vendor',
    orion_beneficio_real_vendor: 'Orion Beneficio Real Vendor',
    directo_tradicional_mvss: 'Directo Tradicional MVSs',
    kinesso_power: 'Kinesso Power',
    kinesso_glass: 'Kinesso Glass',
    notas_kso: 'Notas KSO',
    duo_glass: 'Duo Glass',
    duo_power: 'Duo Power',
    estado: 'Estado'
  };

  getDisplayValue(row: any, column: string): string | number {
    // Si el formulario pide números, muestra el número tal cual
    if (
      column === 'orion_beneficio_real_vendor' ||
      column === 'directo_tradicional_mvss' ||
      column === 'kinesso_power' ||
      column === 'kinesso_glass' ||
      column === 'duo_glass' ||
      column === 'duo_power'
    ) {
      return row[column];
    }
    if (column === 'estado') {
      return row.estado === 1 ? 'Activo' : 'Inactivo';
    }
    return row[column];
  }

  dataSource: any;
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadProveedores();
    this.filteredProveedores = [...this.proveedores];
    this.dataSource = new MatTableDataSource(this.filteredProveedores);
    this.dataSource.paginator = this.paginator;
  }

  ngAfterViewInit() {
    if (this.dataSource && this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  loadProveedores() {
    const data = localStorage.getItem('provedoresKinesso');
    if (data) {
      this.proveedores = JSON.parse(data).map((p: any) => ({
        ...p,
        estado: p.estado ?? 1
      }));
    } else {
      this.proveedores = [];
    }
  }

  saveProveedores() {
    localStorage.setItem('provedoresKinesso', JSON.stringify(this.proveedores));
    this.filteredProveedores = this.getFilteredProveedores();
    if (this.dataSource) {
      this.dataSource.data = this.filteredProveedores;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  onSubmit() {
    if (this.proveedorForm.valid) {
      const newVendor = (this.proveedorForm.value.vendor ?? '').trim().toLowerCase();
      // Validar que no exista un vendor igual
      const exists = this.proveedores.some(
        p => (p.vendor ?? '').trim().toLowerCase() === newVendor
      );
      if (!this.editMode && exists) {
        this.snackBar.open('Ya existe un proveedor con ese Vendor', '', { duration: 2500 });
        return;
      }

      this.snackBar.open('Guardando proveedor...', '', { duration: 1200 });

      const formValue = {
        vendor_medium: this.proveedorForm.value.vendor_medium ?? '',
        vendor_group: this.proveedorForm.value.vendor_group ?? '',
        mediums: this.proveedorForm.value.mediums ?? '',
        vendor: this.proveedorForm.value.vendor ?? '',
        tipo_vendor: this.proveedorForm.value.tipo_vendor ?? '',
        orion_beneficio_real_vendor: Number(this.proveedorForm.value.orion_beneficio_real_vendor),
        directo_tradicional_mvss: Number(this.proveedorForm.value.directo_tradicional_mvss),
        kinesso_power: Number(this.proveedorForm.value.kinesso_power),
        kinesso_glass: Number(this.proveedorForm.value.kinesso_glass),
        notas_kso: this.proveedorForm.value.notas_kso ?? '',
        duo_glass: Number(this.proveedorForm.value.duo_glass),
        duo_power: Number(this.proveedorForm.value.duo_power),
        estado: Number(this.proveedorForm.value.estado)
      };

      if (this.editMode && this.editingId) {
        // Editar existente
        const idx = this.proveedores.findIndex(p => p.id === this.editingId);
        if (idx > -1) {
          this.proveedores[idx] = { id: this.editingId, ...formValue };
        }
        this.editMode = false;
        this.editingId = null;
      } else {
        // Nuevo
        const nuevo = {
          id: Date.now().toString(),
          ...formValue
        };
        this.proveedores.push(nuevo as Proveedor);
      }
      this.saveProveedores();

      // Limpia el formulario y los estados de validación para evitar que los campos se pongan en rojo
      this.proveedorForm.reset({ 
        vendor_medium: '', 
        vendor_group: '', 
        mediums: '', 
        vendor: '', 
        tipo_vendor: '', 
        orion_beneficio_real_vendor: 0, 
        directo_tradicional_mvss: 0, 
        kinesso_power: 0, 
        kinesso_glass: 0, 
        notas_kso: '', 
        duo_glass: 0, 
        duo_power: 0, 
        estado: 1 
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
      vendor_medium: proveedor.vendor_medium,
      vendor_group: proveedor.vendor_group,
      mediums: proveedor.mediums,
      vendor: proveedor.vendor,
      tipo_vendor: proveedor.tipo_vendor,
      orion_beneficio_real_vendor: proveedor.orion_beneficio_real_vendor,
      directo_tradicional_mvss: proveedor.directo_tradicional_mvss,
      kinesso_power: proveedor.kinesso_power,
      kinesso_glass: proveedor.kinesso_glass,
      notas_kso: proveedor.notas_kso,
      duo_glass: proveedor.duo_glass,
      duo_power: proveedor.duo_power,
      estado: proveedor.estado
    });
  }

  cancelarEdicion() {
    this.editMode = false;
    this.editingId = null;
    this.proveedorForm.reset({ estado: 1 });
  }

  onFilterChange() {
    this.filteredProveedores = this.getFilteredProveedores();
    if (this.dataSource) {
      this.dataSource.data = this.filteredProveedores;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  getFilteredProveedores(): Proveedor[] {
    if (!this.filterVendor.trim()) return [...this.proveedores];
    return this.proveedores.filter(p =>
      (p.vendor ?? '').toLowerCase().includes(this.filterVendor.trim().toLowerCase())
    );
  }

  onVendorInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filterVendor = input.value;
    this.onFilterChange();
  }
}
