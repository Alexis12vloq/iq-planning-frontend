import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BackendMediosService } from '../services/backend-medios.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  selector: 'app-modal-eliminar-medios',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCheckboxModule,
    MatListModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="modal-header">
      <h3 mat-dialog-title>
        <mat-icon>delete_sweep</mat-icon>
        Eliminar Medios
      </h3>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="modal-content">
      <div class="warning-message">
        <mat-icon class="warning-icon">warning</mat-icon>
        <p>
          <strong>¡Atención!</strong> Esta acción eliminará todos los items de los medios seleccionados.
          Esta operación no se puede deshacer.
        </p>
      </div>

      <div class="medios-list" *ngIf="mediosActivos.length > 0">
        <h4>Medios disponibles:</h4>
        
        <div class="medios-container">
                     <div *ngFor="let medio of mediosActivos" 
                class="medio-item" 
                [class.selected]="mediosSeleccionados.includes(medio)"
                [class.disabled]="isLoading"
                (click)="!isLoading && toggleMedioClick(medio)">
             <mat-checkbox 
               [checked]="mediosSeleccionados.includes(medio)"
               [disabled]="isLoading"
               (change)="toggleMedio(medio, $event.checked)"
               (click)="$event.stopPropagation()"
               class="medio-checkbox">
            </mat-checkbox>
            
            <div class="medio-info">
              <div class="medio-name">{{ medio }}</div>
              <div class="medio-stats">
                {{ itemsPorMedio[medio]?.length || 0 }} items • 
                {{ calcularPresupuestoTotal(medio) | currency:'USD':'symbol-narrow':'1.0-0' }}
              </div>
            </div>
            
            <div class="medio-items-preview">
              <div *ngFor="let item of itemsPorMedio[medio]?.slice(0, 3)" class="item-preview">
                • {{ (item.proveedor || 'Sin proveedor') + ' - ' + (item.canal || 'Sin canal') }}
              </div>
              <div *ngIf="(itemsPorMedio[medio]?.length || 0) > 3" class="more-items">
                ... y {{ (itemsPorMedio[medio]?.length || 0) - 3 }} más
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="no-medios" *ngIf="mediosActivos.length === 0">
        <mat-icon class="empty-icon">info</mat-icon>
        <p>No hay medios disponibles para eliminar.</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="modal-actions">
      <button 
        mat-button 
        mat-dialog-close
        [disabled]="isLoading"
        class="cancel-btn">
        Cancelar
      </button>
      
      <button 
        mat-raised-button 
        color="warn"
        [disabled]="mediosSeleccionados.length === 0 || isLoading"
        (click)="confirmarEliminacion()"
        class="delete-btn">
        <mat-icon>delete_forever</mat-icon>
        Eliminar {{ mediosSeleccionados.length }} Medio(s)
      </button>
    </mat-dialog-actions>

    <!-- Loading Overlay -->
    <div *ngIf="isLoading" class="loading-overlay">
      <div class="loading-content">
        <mat-spinner diameter="50"></mat-spinner>
        <p class="loading-text">Eliminando medios...</p>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);

      h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #d32f2f;
        font-size: 20px;
        font-weight: 600;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }
    }

    .modal-content {
      padding: 24px;
      max-height: 400px;
      overflow-y: auto;

      .warning-message {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        border: 1px solid #ffc107;
        border-radius: 8px;
        margin-bottom: 24px;
        box-shadow: 0 2px 4px rgba(255, 193, 7, 0.1);

        .warning-icon {
          color: #f39c12;
          font-size: 24px;
          width: 24px;
          height: 24px;
          margin-top: 2px;
          flex-shrink: 0;
        }

        p {
          margin: 0;
          color: #856404;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 500;
        }
      }

      .medios-list {
        h4 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
        }

        .medios-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .medio-item {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;

          &:hover {
            border-color: #d32f2f;
            box-shadow: 0 4px 12px rgba(211, 47, 47, 0.15);
            transform: translateY(-1px);
          }

          &.selected {
            border-color: #d32f2f;
            background: linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%);
            box-shadow: 0 2px 8px rgba(211, 47, 47, 0.1);
          }

          &.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            
            &:hover {
              border-color: #e0e0e0;
              box-shadow: none;
              transform: none;
            }
          }

          .medio-checkbox {
            margin-right: 16px;
            margin-top: 4px;
            flex-shrink: 0;
          }

          .medio-info {
            flex: 1;
            margin-right: 16px;

            .medio-name {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 6px;
            }

            .medio-stats {
              font-size: 13px;
              color: #666;
              font-weight: 500;
            }
          }

          .medio-items-preview {
            flex: 1;
            max-width: 200px;

            .item-preview {
              font-size: 12px;
              color: #666;
              margin-bottom: 3px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding-left: 8px;
            }

            .more-items {
              font-size: 11px;
              color: #999;
              font-style: italic;
              padding-left: 8px;
            }
          }
        }
      }

      .no-medios {
        text-align: center;
        padding: 40px 20px;
        color: #666;

        .empty-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #ccc;
          margin-bottom: 16px;
        }

        p {
          margin: 0;
          font-size: 16px;
        }
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);

      .cancel-btn {
        color: #666;
        font-weight: 500;
        
        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }
      }

      .delete-btn {
        background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
        color: white;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #b71c1c 0%, #a01515 100%);
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
          transform: translateY(-1px);
        }

        &:disabled {
          background: #ccc;
          color: #888;
          box-shadow: none;
          transform: none;
        }

        mat-icon {
          margin-right: 8px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      border-radius: 8px;

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 30px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border: 1px solid #e0e0e0;

        .loading-text {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #333;
          text-align: center;
        }

        mat-spinner {
          margin: 0;
        }
      }
    }
  `]
})
export class ModalEliminarMediosComponent implements OnInit {
  mediosActivos: string[] = [];
  itemsPorMedio: { [medio: string]: any[] } = {};
  mediosSeleccionados: string[] = [];
  isLoading = false;
  
  // Variables para controlar el progreso de eliminación
  private mediosEliminados = 0;
  private mediosConErrores = 0;
  private totalMediosAEliminar = 0;

  constructor(
    private dialogRef: MatDialogRef<ModalEliminarMediosComponent>,
    private backendMediosService: BackendMediosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.mediosActivos = data.mediosActivos || [];
    this.itemsPorMedio = data.itemsPorMedio || {};
  }

  ngOnInit(): void {
    console.log('Modal Eliminar Medios - Medios activos:', this.mediosActivos);
    console.log('Modal Eliminar Medios - Items por medio:', this.itemsPorMedio);
  }

  toggleMedio(medio: string, checked: boolean): void {
    if (checked) {
      if (!this.mediosSeleccionados.includes(medio)) {
        this.mediosSeleccionados.push(medio);
      }
    } else {
      this.mediosSeleccionados = this.mediosSeleccionados.filter(m => m !== medio);
    }
  }

  toggleMedioClick(medio: string): void {
    const isSelected = this.mediosSeleccionados.includes(medio);
    this.toggleMedio(medio, !isSelected);
  }

  calcularPresupuestoTotal(medio: string): number {
    const items = this.itemsPorMedio[medio] || [];
    return items.reduce((total, item) => total + (item.valorTotal || 0), 0);
  }

  confirmarEliminacion(): void {
    if (this.mediosSeleccionados.length === 0) {
      this.snackBar.open('Debe seleccionar al menos un medio para eliminar', '', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const totalItems = this.mediosSeleccionados.reduce((total, medio) => {
      return total + (this.itemsPorMedio[medio]?.length || 0);
    }, 0);

    // Mostrar confirmación con el nuevo componente
    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '550px',
      data: {
        message: `¿Estás seguro de que quieres eliminar ${this.mediosSeleccionados.length} medio(s)?`,
        details: [
          `Esta acción eliminará ${totalItems} item(s) en total`,
          ...this.mediosSeleccionados.map(medio => 
            `• ${medio} (${this.itemsPorMedio[medio]?.length || 0} items)`
          )
        ],
        confirmText: `Eliminar ${this.mediosSeleccionados.length} Medio(s)`
      },
      disableClose: true
    });

    confirmDialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        console.log('🗑️ Confirmada eliminación de medios:', this.mediosSeleccionados);
        this.isLoading = true;
        this.eliminarMediosSeleccionados();
      }
    });
  }

  private eliminarMediosSeleccionados(): void {
    // Inicializar contadores
    this.mediosEliminados = 0;
    this.mediosConErrores = 0;
    this.totalMediosAEliminar = this.mediosSeleccionados.length;

    this.mediosSeleccionados.forEach(medio => {
      const itemsDelMedio = this.itemsPorMedio[medio] || [];
      
      if (itemsDelMedio.length === 0) {
        this.mediosEliminados++;
        this.finalizarEliminacion();
        return;
      }

      let itemsEliminados = 0;
      let itemsConErrores = 0;

      // Procesar cada item del medio
      itemsDelMedio.forEach(item => {
        const planMedioItemId = item.planMedioItemId;
        
        if (!planMedioItemId || planMedioItemId <= 0) {
          itemsEliminados++;
          this.verificarMedioEliminado(medio, itemsDelMedio.length, itemsEliminados, itemsConErrores);
          return;
        }

        // Eliminar del backend
        this.backendMediosService.eliminarPlanMedioItemFlowchart(planMedioItemId).subscribe({
          next: (response) => {
            console.log(`✅ Item ${planMedioItemId} eliminado del backend:`, response);
            
            if (response.success) {
              itemsEliminados++;
            } else {
              console.error(`❌ Error del servidor al eliminar item ${planMedioItemId}:`, response.message);
              itemsConErrores++;
            }
            
            this.verificarMedioEliminado(medio, itemsDelMedio.length, itemsEliminados, itemsConErrores);
          },
          error: (error) => {
            console.error(`❌ Error eliminando item ${planMedioItemId} del backend:`, error);
            itemsConErrores++;
            this.verificarMedioEliminado(medio, itemsDelMedio.length, itemsEliminados, itemsConErrores);
          }
        });
      });
    });
  }

  private verificarMedioEliminado(
    medio: string, 
    totalItems: number, 
    itemsEliminados: number, 
    itemsConErrores: number
  ): void {
    if (itemsEliminados + itemsConErrores >= totalItems) {
      if (itemsEliminados > 0 && itemsConErrores === 0) {
        this.mediosEliminados++;
      } else {
        this.mediosConErrores++;
      }
      
      this.finalizarEliminacion();
    }
  }

  private finalizarEliminacion(): void {
    if (this.mediosEliminados + this.mediosConErrores >= this.totalMediosAEliminar) {
      console.log(`🗑️ === ELIMINACIÓN DE MEDIOS FINALIZADA ===`);
      console.log(`📊 Resumen: ${this.mediosEliminados} medios eliminados, ${this.mediosConErrores} con errores de ${this.totalMediosAEliminar} total`);

      const mediosEliminados = this.mediosSeleccionados.slice(0, this.mediosEliminados);

      this.isLoading = false;
      this.dialogRef.close({
        mediosEliminados: mediosEliminados,
        totalEliminados: this.mediosEliminados,
        totalErrores: this.mediosConErrores
      });
    }
  }
} 