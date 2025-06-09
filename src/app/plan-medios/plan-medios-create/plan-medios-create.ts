  import { Component } from '@angular/core';
  import { RouterOutlet } from '@angular/router';
  import { MatFormFieldModule } from '@angular/material/form-field';  // Para mat-form-field
  import { MatInputModule } from '@angular/material/input';  // Para matInput
  import { MatCardModule } from '@angular/material/card';  // Para mat-card
  import { MatSelectModule } from '@angular/material/select';  // Para mat-select
  import { MatButtonModule } from '@angular/material/button';  // Para mat-button
  import { MatDatepickerModule } from '@angular/material/datepicker';  // Para mat-datepicker
  import { MatIconModule } from '@angular/material/icon';  // Para mat-icon
  import { MatMenuModule } from '@angular/material/menu';  // Para mat-menu
  import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';  // Para ngForm y ReactiveForms
  import { MatNativeDateModule } from '@angular/material/core';  // Para el Datepicker
import { map, Observable, startWith } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';

  @Component({
    selector: 'app-plan-medios-create',
    standalone: true,
    imports: [
      CommonModule,
      MatCardModule,
      MatFormFieldModule,
      MatInputModule,
      MatSelectModule,
      MatButtonModule,
      MatAutocompleteModule,
      MatDatepickerModule,
      MatIconModule,
      MatMenuModule,
      FormsModule,
      ReactiveFormsModule,  // Asegúrate de importar ReactiveFormsModule
      MatNativeDateModule
    ],
    templateUrl: './plan-medios-create.html',
    styleUrls: ['./plan-medios-create.scss']
  })
  export class PlanMediosCreate {

    planMediosForm = new FormGroup({
      planName: new FormControl(''),
      paisFacturacion: new FormControl(''),
      clienteAnunciante: new FormControl(''),
      marca: new FormControl(''),
      producto: new FormControl(''),
      campana: new FormControl(''),
      startDate: new FormControl(''),
      endDate: new FormControl(''),
      version: new FormControl(''),
    });
  
    paisFacturacionOptions: string[] = ['País 1', 'País 2', 'País 3'];
    clienteAnuncianteOptions: string[] = ['Cliente 1', 'Cliente 2', 'Cliente 3'];
  
    filteredPaisFacturacion: Observable<string[]>;
    filteredClienteAnunciante: Observable<string[]>;
  
    constructor() {
      // Filtrar las opciones conforme el usuario escribe en el campo "Pais Facturación"
      this.filteredPaisFacturacion = this.planMediosForm.get('paisFacturacion')!.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '', this.paisFacturacionOptions))  // Asegurarse de que no sea null
      );
  
      // Filtrar las opciones conforme el usuario escribe en el campo "Cliente Anunciante"
      this.filteredClienteAnunciante = this.planMediosForm.get('clienteAnunciante')!.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '', this.clienteAnuncianteOptions))  // Asegurarse de que no sea null
      );
    }
  
    // Función para filtrar las opciones
    private _filter(value: string, options: string[]): string[] {
      const filterValue = value.toLowerCase();
      return options.filter(option => option.toLowerCase().includes(filterValue));
    }
  
    onSubmit() {
      console.log('Formulario enviado', this.planMediosForm.value);
    }
  }
