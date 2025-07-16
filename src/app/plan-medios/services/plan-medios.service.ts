import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../shared/app-config';

@Injectable({
  providedIn: 'root'
})
export class PlanMediosService {
  private readonly backendUrls = [
    'https://localhost:7223/api/planmedios/consultar',
    'http://localhost:5000/api/planmedios/consultar',
    'http://localhost:5001/api/planmedios/consultar',
    'http://localhost:7000/api/planmedios/consultar'
  ];

  private apiUrl = this.backendUrls[0];

  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {}

  /**
   * Cambiar la URL del backend (si decides usar URLs alternas)
   */
  setBackendUrl(index: number): void {
    if (index >= 0 && index < this.backendUrls.length) {
      this.apiUrl = this.backendUrls[index];
      console.log(`Backend URL cambiada a: ${this.apiUrl}`);
    }
  }

  getCurrentUrl(): string {
    return this.apiUrl;
  }

  /**
   * Crear plan de medios
   */
  crearPlanMedios(body: any): Observable<any> {
    return this.http.post(`${this.config.apiUrl}/api/PlanMedios`, body);
  }

  /**
   * Consultar paginado
   */
  consultarPaginado(pageNumber: number = 1, pageSize: number = 1000): Observable<any> {
    const query = { pagination: { pageNumber, pageSize } };
    console.log(`Consultando: ${this.apiUrl}`);
    return this.http.post<any>(this.apiUrl, query);
  }

  /**
   * Consultar planes con detalles completos
   */
  consultarPlanesConDetalles(): Observable<any> {
    const url = `${this.config.apiUrl}/api/PlanMedios/with-details`;
    console.log(`Consultando planes con detalles: ${url}`);
    return this.http.get<any>(url);
  }

  /**
   * Cargar todos (usando pageSize grande)
   */
  cargarTodos(): Observable<any> {
    return this.consultarPaginado(1, 1000);
  }

  /**
   * Obtener parámetros de tabla específica
   */
  obtenerParametrosTabla(tabla: string): Observable<any> {
    return this.http.get(`${this.config.apiUrl}/api/TablaParametros/by-tabla/${tabla}`);
  }

  /**
   * Obtener todos los parámetros de todas las tablas
   */
  obtenerTodosParametros(): Observable<any> {
    return this.http.get(`${this.config.apiUrl}/api/TablaParametros`);
  }

  /**
   * Nuevo método: consultar paginado usando el endpoint with-details
   */
  consultarPaginadoWithDetails(page: number = 1, pageSize: number = 10): Observable<any> {
    const url = `${this.config.apiUrl}/api/PlanMedios/with-details?page=${page}&pageSize=${pageSize}`;
    return this.http.get<any>(url);
  }
}
