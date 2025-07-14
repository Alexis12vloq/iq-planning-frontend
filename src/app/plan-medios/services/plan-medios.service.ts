import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanMediosQuery, PlanMediosFilter, PagedResult, PlanMediosListDto } from '../models/plan-medios-dto.model';

@Injectable({
  providedIn: 'root'
})
export class PlanMediosService {
  // URLs disponibles para el backend
  private readonly backendUrls = [
    'https://localhost:7223/api/planmedios/consultar',
    'http://localhost:5000/api/planmedios/consultar',
    'http://localhost:5001/api/planmedios/consultar',
    'http://localhost:7000/api/planmedios/consultar'
  ];
  
  // URL por defecto (cambiar índice según sea necesario: 0, 1, 2, o 3)
  private apiUrl = this.backendUrls[0];
  
  constructor(private http: HttpClient) {}
  
  /**
   * Cambiar la URL del backend
   * @param index Índice de la URL: 0 (puerto 7223 HTTPS), 1 (puerto 5000), 2 (puerto 5001), 3 (puerto 7000)
   */
  setBackendUrl(index: number): void {
    if (index >= 0 && index < this.backendUrls.length) {
      this.apiUrl = this.backendUrls[index];
      console.log(`Backend URL cambiada a: ${this.apiUrl}`);
    }
  }
  
  /**
   * Obtener la URL actual del backend
   */
  getCurrentUrl(): string {
    return this.apiUrl;
  }
  
  /**
   * Consultar datos del backend solo con paginación (sin filtros)
   * Los filtros se manejan a nivel de frontend
   */
  consultarPaginado(pageNumber: number = 1, pageSize: number = 1000): Observable<PagedResult<PlanMediosListDto>> {
    const query = { pagination: { pageNumber, pageSize } };
    console.log(`Consultando: ${this.apiUrl}`);
    console.log('Query (solo paginación):', query);
    return this.http.post<PagedResult<PlanMediosListDto>>(this.apiUrl, query);
  }
  
  /**
   * Cargar todos los datos sin filtros (para filtrado frontend)
   * Usa un pageSize grande para obtener todos los registros
   */
  cargarTodos(): Observable<PagedResult<PlanMediosListDto>> {
    return this.consultarPaginado(1, 1000);
  }
} 