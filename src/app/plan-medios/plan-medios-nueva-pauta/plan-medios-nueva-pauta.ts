import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

interface PautaRow {
  tipoCompra: string;
  proveedor: string;
  vehiculo: string;
  programa: string;
  emision: string;
  franja: string;
  hora: string;
  formato: string;
  ratCanal: number;
  ratUpPer: number;
  tarifaBruta30: number;
  duracionReal: string;
  tarifaBruta30Valor: number;
  valorNeto: number;
}

@Component({
  selector: 'app-plan-medios-nueva-pauta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './plan-medios-nueva-pauta.html',
  styleUrls: ['./plan-medios-nueva-pauta.scss']
})
export class PlanMediosNuevaPauta implements OnInit {
  pautaForm!: FormGroup;
  pautas: PautaRow[] = [];

  displayedColumns: string[] = [
    'tipoCompra',
    'proveedor',
    'vehiculo',
    'programa',
    'emision',
    'franja',
    'hora',
    'formato',
    'ratCanal',
    'ratUpPer',
    'tarifaBruta30',
    'duracionReal',
    'tarifaBruta30Valor',
    'valorNeto'
  ];

  columnLabels: { [key: string]: string } = {
    tipoCompra: 'Tipo de Compra',
    proveedor: 'Proveedor',
    vehiculo: 'Vehículo',
    programa: 'Programa',
    emision: 'Emisión',
    franja: 'Franja',
    hora: 'Hora',
    formato: 'Formato',
    ratCanal: 'RAT Canal',
    ratUpPer: 'RAT UP PER',
    tarifaBruta30: 'Tarifa Bruta 30"',
    duracionReal: 'Duración Real',
    tarifaBruta30Valor: 'Tarifa Bruta 30" Valor',
    valorNeto: 'Valor Neto'
  };

  tiposCompra: string[] = ['NORMAL', 'ORION', 'KINESSO'];
  proveedores: string[] = ['CARACOL TELEVISIÓN', 'RCN TELEVISIÓN', 'ORION'];
  vehiculos: string[] = ['CRC', 'RCN ACUERDO 1355'];
  programas: string[] = ['NOTICIAS 12:30', 'NOTICIERO 6AM', 'MAÑANA EXPRESS'];
  emisiones: string[] = ['EARLY', 'DAY', 'PRIME'];
  franjas: string[] = ['EARLY', 'DAY', 'PRIME'];
  formatos: string[] = ['MENCION'];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    // Obtener datos del plan desde el estado de navegación
    const navigation = this.router.getCurrentNavigation();
    const planData = navigation?.extras?.state?.['planData'];

    if (!planData) {
      this.router.navigate(['/plan-medios-resumen']);
      return;
    }

    this.pautaForm = this.fb.group({
      tipoCompra: ['', Validators.required],
      proveedor: ['', Validators.required],
      vehiculo: ['', Validators.required],
      programa: ['', Validators.required],
      emision: ['', Validators.required],
      franja: ['', Validators.required],
      hora: ['', Validators.required],
      formato: ['', Validators.required],
      ratCanal: ['', [Validators.required, Validators.min(0)]],
      ratUpPer: ['', [Validators.required, Validators.min(0)]],
      tarifaBruta30: ['', [Validators.required, Validators.min(0)]],
      duracionReal: ['', Validators.required],
      tarifaBruta30Valor: ['', [Validators.required, Validators.min(0)]],
      valorNeto: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.pautaForm.valid) {
      // Agregar la nueva pauta a la lista
      this.pautas.push(this.pautaForm.value);
      
      // Reiniciar el formulario
      this.pautaForm.reset();
      
      // Opcional: Mantener algunos valores que podrían ser comunes entre pautas
      this.pautaForm.patchValue({
        tipoCompra: this.pautas[this.pautas.length - 1].tipoCompra,
        proveedor: this.pautas[this.pautas.length - 1].proveedor,
        vehiculo: this.pautas[this.pautas.length - 1].vehiculo
      });
    }
  }

  onCargaExcel(): void {
    console.log('Carga Excel clicked');
  }

  onDescargaExcel(): void {
    console.log('Descarga Excel clicked');
  }

  onRegresar(): void {
    this.router.navigate(['/plan-medios-resumen']);
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }
} 