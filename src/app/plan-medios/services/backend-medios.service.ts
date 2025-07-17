import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../shared/app-config';
import { MedioBackend, ProveedorBackend } from '../models/backend-models';

@Injectable({
  providedIn: 'root'
})
export class BackendMediosService {
  
  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {}

  // Obtener todos los medios
  getMedios(): Observable<MedioBackend[]> {
    return this.http.get<MedioBackend[]>(`${this.config.apiUrl}/api/Medios`);
  }

  // Obtener proveedores por medio ID
  getProveedoresPorMedio(medioId: number): Observable<ProveedorBackend[]> {
    return this.http.get<ProveedorBackend[]>(`${this.config.apiUrl}/api/Proveedores/by-medio/${medioId}`);
  }
} 