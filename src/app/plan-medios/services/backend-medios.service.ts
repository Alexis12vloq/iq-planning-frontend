import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG_VALUE } from '../../shared/app-config';
import {
  MedioBackend,
  ProveedorBackend,
  PlanMedioItemBackend,
  CrearPlanMedioItemRequest,
  PlanMedioItemUpdateDto,
  EliminarPlanMedioItemResponse,
  OperacionExitosaResponse,
  TemplatePantallaJsonBackend,
  ActualizarPlanMedioItemRequest,
  ActualizarPlanMedioItemFlowchartRequest,
  CrearPlanMedioItemFlowchartRequest,
  PlanMedioItemFlowchartBackend,
  ActualizarDataJsonRequest,
  ActualizarCalendarioJsonRequest
} from '../models/backend-models';

interface DescargarTemplatePantallaRequest {
  planMedioId: number;
  version: number;
  tipoTemplate: string;
}

interface CanalBackend {
  canalId: number;
  nombre: string;
  proveedorId: number;
}

@Injectable({
  providedIn: 'root'
})
export class BackendMediosService {
  private baseUrl = APP_CONFIG_VALUE.apiUrl;

  constructor(private http: HttpClient) {}

  // ==============================================
  // 📋 MEDIOS Y PROVEEDORES
  // ==============================================

  // Obtener todos los medios
  getMedios(): Observable<MedioBackend[]> {
    const url = `${this.baseUrl}/api/Medios`;
    return this.http.get<MedioBackend[]>(url);
  }

  // Obtener proveedores por medio ID
  getProveedoresPorMedio(medioId: number): Observable<ProveedorBackend[]> {
    const url = `${this.baseUrl}/api/Proveedores/by-medio/${medioId}`;
    return this.http.get<ProveedorBackend[]>(url);
  }

  // ==============================================
  // 📋 PLAN MEDIO ITEM - ENDPOINTS BÁSICOS
  // ==============================================

  // 1. Crear Item
  crearPlanMedioItem(request: CrearPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    return this.http.post<PlanMedioItemBackend>(url, request);
  }

  // 2. Obtener Item por ID
  getPlanMedioItemPorId(planMedioItemId: number): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    return this.http.get<PlanMedioItemBackend>(url);
  }

  // 3. Obtener Todos los Items
  getAllPlanMedioItems(): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 4. Actualizar Item (PUT)
  updatePlanMedioItem(dto: PlanMedioItemUpdateDto): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    return this.http.put<PlanMedioItemBackend>(url, dto);
  }

  // 5. Eliminar Item
  eliminarPlanMedioItem(planMedioItemId: number): Observable<EliminarPlanMedioItemResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    return this.http.delete<EliminarPlanMedioItemResponse>(url);
  }

  // 6. Obtener Items por Plan y Versión (Con Detalles)
  getPlanMedioItemsPorPlan(planMedioId: number, version: number): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem/by-plan/${planMedioId}/version/${version}`;
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 7. Obtener Todos los Items con Detalles
  getAllPlanMedioItemsWithDetails(): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem/with-details`;
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 8. Obtener Item por ID con Detalles
  getPlanMedioItemPorIdWithDetails(planMedioItemId: number): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}/with-details`;
    return this.http.get<PlanMedioItemBackend>(url);
  }

  // 9. Actualizar Solo JSON (PATCH)
  actualizarDataJson(request: ActualizarDataJsonRequest): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItem/update-json`;
    return this.http.patch<OperacionExitosaResponse>(url, request);
  }

  // ==============================================
  // 🔄 PLAN MEDIO ITEM FLOWCHART - ENDPOINTS
  // ==============================================

  // 1. Crear Item de Flowchart
  crearPlanMedioItemFlowchart(request: CrearPlanMedioItemFlowchartRequest): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart`;
    return this.http.post<PlanMedioItemFlowchartBackend>(url, request);
  }

  // 2. Actualizar Item de Flowchart
  actualizarPlanMedioItemFlowchart(request: ActualizarPlanMedioItemFlowchartRequest): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart`;
    return this.http.put<PlanMedioItemFlowchartBackend>(url, request);
  }

  // 3. Eliminar Item de Flowchart
  eliminarPlanMedioItemFlowchart(planMedioItemId: number): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/${planMedioItemId}`;
    return this.http.delete<OperacionExitosaResponse>(url);
  }

  // 4. Obtener Item de Flowchart por ID
  getPlanMedioItemFlowchartPorId(planMedioItemId: number): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/${planMedioItemId}`;
    return this.http.get<PlanMedioItemFlowchartBackend>(url);
  }

  // 5. Obtener Items de Flowchart por Plan
  getPlanMedioItemsFlowchartPorPlan(planMedioId: number, version: number): Observable<PlanMedioItemFlowchartBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/by-plan/${planMedioId}/version/${version}`;
    return this.http.get<PlanMedioItemFlowchartBackend[]>(url);
  }

  // 6. Actualizar Solo Calendario JSON
  actualizarCalendarioJson(request: ActualizarCalendarioJsonRequest): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/update-calendario`;
    return this.http.patch<OperacionExitosaResponse>(url, request);
  }



  // ==============================================
  // 🔧 MÉTODOS ADICIONALES Y COMPATIBILIDAD
  // ==============================================

  // ✅ MÉTODO EXISTENTE - Actualizar un PlanMedioItem existente (solo para JSON/spots)
  // Manteniendo para compatibilidad con código existente
  actualizarPlanMedioItem(request: ActualizarPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/update-json`;
    return this.http.patch<PlanMedioItemBackend>(url, request);
  }

  // ✅ NUEVO: Obtener Templates por Medio y País
  getTemplatesPorMedioYPais(medioId: number, paisId: number): Observable<TemplatePantallaJsonBackend[]> {
    const url = `${this.baseUrl}/api/TemplatePantallaJson/by-medio-and-pais`;
    const params = new HttpParams()
      .set('medioId', medioId.toString())
      .set('paisId', paisId.toString());
    return this.http.get<TemplatePantallaJsonBackend[]>(url, { params });
  }

  // ✅ NUEVO: Obtener Templates por Medio solamente
  getTemplatesPorMedio(medioId: number): Observable<TemplatePantallaJsonBackend[]> {
    const url = `${this.baseUrl}/api/TemplatePantallaJson/by-medio`;
    const params = new HttpParams()
      .set('medioId', medioId.toString());
    return this.http.get<TemplatePantallaJsonBackend[]>(url, { params });
  }

  // ✅ MÉTODO EXISTENTE - Descargar template
  descargarTemplatePantalla(request: DescargarTemplatePantallaRequest): Observable<any> {
    const url = `${this.baseUrl}/api/TemplatePantallaJson/download-template`;
    return this.http.post(url, request, {
      responseType: 'blob'
    });
  }

  // ==============================================
  // 📺 CANALES
  // ==============================================

  // Obtener todos los canales
  getAllCanales(): Observable<CanalBackend[]> {
    const url = `${this.baseUrl}/api/Canales`;
    return this.http.get<CanalBackend[]>(url);
  }

  // Obtener canales por proveedor
  getCanalesPorProveedor(proveedorId: number): Observable<CanalBackend[]> {
    const url = `${this.baseUrl}/api/Canales/by-proveedor/${proveedorId}`;
    return this.http.get<CanalBackend[]>(url);
  }
} 