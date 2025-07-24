import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon color="warn">warning</mat-icon>
          Confirmar Eliminación
        </h2>
      </div>
      
      <mat-dialog-content class="dialog-content">
        <div class="warning-message">
          <mat-icon color="warn">delete_forever</mat-icon>
          <p>{{ data.message }}</p>
        </div>
        
        <div class="details-section" *ngIf="data.details">
          <h4>Detalles:</h4>
          <div class="details-list">
            <div *ngFor="let detail of data.details" class="detail-item">
              <mat-icon>info</mat-icon>
              <span>{{ detail }}</span>
            </div>
          </div>
        </div>
        
        <div class="danger-notice">
          <mat-icon color="warn">error</mat-icon>
          <span>Esta acción no se puede deshacer.</span>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-btn">
          <mat-icon>cancel</mat-icon>
          Cancelar
        </button>
        <button 
          mat-raised-button 
          color="warn"
          (click)="onConfirm()"
          class="confirm-btn">
          <mat-icon>delete_forever</mat-icon>
          {{ data.confirmText || 'Eliminar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 450px;
      max-width: 600px;
    }
    
    .dialog-header {
      background: linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%);
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
      
      h2 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #e65100;
        font-size: 20px;
        font-weight: 600;
        
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }
    }
    
    .dialog-content {
      padding: 24px;
      
      .warning-message {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 20px;
        padding: 16px;
        background: #fff3e0;
        border-radius: 8px;
        border-left: 4px solid #ff9800;
        
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        p {
          margin: 0;
          font-size: 16px;
          color: #333;
          line-height: 1.5;
          font-weight: 500;
        }
      }
      
      .details-section {
        margin-bottom: 20px;
        
        h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        
        .details-list {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          border: 1px solid #e0e0e0;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #333;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #666;
            flex-shrink: 0;
          }
        }
      }
      
      .danger-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d32f2f;
        font-size: 14px;
        font-weight: 600;
        padding: 12px;
        background: #ffebee;
        border-radius: 6px;
        border-left: 4px solid #d32f2f;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
      
      .cancel-btn {
        color: #666;
        font-weight: 500;
        
        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        
        mat-icon {
          margin-right: 6px;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      
      .confirm-btn {
        background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
        color: white;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #b71c1c 0%, #a01515 100%);
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
          transform: translateY(-1px);
        }
        
        mat-icon {
          margin-right: 6px;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      message: string;
      details?: string[];
      confirmText?: string;
    }
  ) {}
  
  onCancel(): void {
    this.dialogRef.close(false);
  }
  
  onConfirm(): void {
    this.dialogRef.close(true);
  }
} 