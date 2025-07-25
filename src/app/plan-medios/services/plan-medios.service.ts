import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../shared/app-config';

@Injectable({
  providedIn: 'root'
})
export class PlanMediosService {
  private readonly backendUrls = [
    'https://iq-planningapi20250714104214-dnebf8aqhnerdjba.mexicocentral-01.azurewebsites.net'
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

  updatePlanMedios(body: any): Observable<any> {
    return this.http.post(`${this.config.apiUrl}/api/PlanMedios/update`, body);
  }
  /**
   * Consultar paginado
   */
  consultarPaginado(pageNumber: number = 1, pageSize: number = 1000): Observable<any> {
    const query = { pagination: { pageNumber, pageSize } };
    return this.http.post<any>(this.apiUrl, query);
  }

  /**
   * Consultar planes con detalles completos
   */
  consultarPlanesConDetalles(): Observable<any> {
    const url = `${this.config.apiUrl}/api/PlanMedios/with-details`;
    return this.http.get<any>(url);
  }

  /**
   * Cargar todos (usando pageSize grande)
   */
  cargarTodos(): Observable<any> {
    return this.consultarPaginado(1, 1000);
  }

  obtenerParametrosTabla(tabla: string): Observable<any> {
    return this.http.get(`${this.config.apiUrl}/api/TablaParametros/by-tabla/${tabla}`);
  }

  obtenerTodosParametros(): Observable<any> {
    return this.http.get(`${this.config.apiUrl}/api/TablaParametros`);
  }
  formatDate(fecha: string | Date): string {
    if (!fecha) return '';
    
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(date.getTime())) return '';

    return date.toISOString().slice(0, 10); // Devuelve la fecha en formato yyyy-MM-dd
  }
  formatDateCreacion(fecha: string | Date): string {
  if (!fecha) return '';

  if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`; // yyyy-MM-dd
  }

  const date = new Date(fecha);
  if (isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10); // yyyy-MM-dd
}
  consultarPaginadoWithDetails(
    page: number = 1,
    pageSize: number = 10,
    filtros: any
  ): Observable<any> {
      const hayFiltros =
      filtros.numeroPlan ||
      filtros.version ||
      filtros.anunciante ||
      filtros.cliente ||
      filtros.marca ||
      filtros.producto ||
      filtros.fechaInicio ||
      filtros.fechaFin;

    // Si hay filtros, reiniciar la página a 1
    if (hayFiltros) {
      page = 1;
    }
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    // Mapeo directo al DTO esperado en backend
    if (filtros.numeroPlan) {
      params = params.set('numeroPlan', filtros.numeroPlan);
    }

    if (filtros.version) {
      params = params.set('version', filtros.version);
    }

    if (filtros.anunciante) {
      params = params.set('idClienteAnunciante', filtros.anunciante);
    }

    if (filtros.cliente) {
      params = params.set('idClienteFacturacion', filtros.cliente);
    }

    if (filtros.marca) {
      params = params.set('idMarca', filtros.marca);
    }

    if (filtros.producto) {
      params = params.set('idProducto', filtros.producto);
    }

    if (filtros.fechaInicio) {
      params = params.set('fechaInicio', this.formatDate(filtros.fechaInicio));
    }

    if (filtros.fechaFin) {
      params = params.set('fechaFin', this.formatDate(filtros.fechaFin));
    }

    const url = `${this.config.apiUrl}/api/PlanMedios/with-details`;
    return this.http.get<any>(url, { params });
  }


  consultarPaginadoWithDetailsPlan(
    numeroPlan: number,
    page: number = 1,
    pageSize: number = 10,
    filtros: any = {}
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    // Filtros opcionales
    if (filtros.version) {
      params = params.set('version', filtros.version);
    }

    if (filtros.fechaCreacion) {
      const fechaFormateada = this.formatDateCreacion(filtros.fechaCreacion); // "2025-07-18"
      if (fechaFormateada) {
        params = params.set('fechaCreacion', fechaFormateada);
      }
    }

    const url = `${this.config.apiUrl}/api/PlanMedios/with-details-plan/${numeroPlan}/versiones`;
    return this.http.get<any>(url, { params });
  }


  consultarPlanDeMedios(id: number = 1): Observable<any> {
    const url = `${this.config.apiUrl}/api/PlanMedios/${id}`;
    return this.http.get<any>(url);
  }

  newVersion(id: number, idUsuarioCreador: number): Observable<any> {
    const url = `${this.config.apiUrl}/api/PlanMedios/${id}/new-version?idUsuarioCreador=${idUsuarioCreador}`;
    return this.http.post<any>(url, {});
  }
}
