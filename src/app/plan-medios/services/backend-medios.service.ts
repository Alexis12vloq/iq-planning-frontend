import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG_VALUE } from '../../shared/app-config';
import { 
  MedioBackend, 
  ProveedorBackend, 
  PlanMedioItemBackend, 
  PlanMedioItemFlowchartBackend,
  CrearPlanMedioItemRequest, 
  ActualizarPlanMedioItemRequest, 
  PlanMedioItemUpdateDto,
  CrearPlanMedioItemFlowchartRequest,
  ActualizarPlanMedioItemFlowchartRequest,
  ActualizarDataJsonRequest,
  ActualizarCalendarioJsonRequest,
  EliminarPlanMedioItemResponse,
  OperacionExitosaResponse
} from '../models/backend-models';

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
    console.log('🔄 GET Medios:', url);
    return this.http.get<MedioBackend[]>(url);
  }

  // Obtener proveedores por medio ID
  getProveedoresPorMedio(medioId: number): Observable<ProveedorBackend[]> {
    const url = `${this.baseUrl}/api/Proveedores/by-medio/${medioId}`;
    console.log('🔄 GET Proveedores por medio:', url);
    return this.http.get<ProveedorBackend[]>(url);
  }

  // ==============================================
  // 📋 PLAN MEDIO ITEM - ENDPOINTS BÁSICOS
  // ==============================================

  // 1. Crear Item
  crearPlanMedioItem(request: CrearPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    console.log('🔄 POST PlanMedioItem:', url, request);
    return this.http.post<PlanMedioItemBackend>(url, request);
  }

  // 2. Obtener Item por ID
  getPlanMedioItemPorId(planMedioItemId: number): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    console.log('🔄 GET PlanMedioItem por ID:', url);
    return this.http.get<PlanMedioItemBackend>(url);
  }

  // 3. Obtener Todos los Items
  getAllPlanMedioItems(): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    console.log('🔄 GET Todos los PlanMedioItems:', url);
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 4. Actualizar Item (PUT)
  updatePlanMedioItem(dto: PlanMedioItemUpdateDto): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    console.log('🔄 PUT PlanMedioItem (Update):', url, dto);
    return this.http.put<PlanMedioItemBackend>(url, dto);
  }

  // 5. Eliminar Item
  eliminarPlanMedioItem(planMedioItemId: number): Observable<EliminarPlanMedioItemResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    console.log('🔄 DELETE PlanMedioItem:', url);
    return this.http.delete<EliminarPlanMedioItemResponse>(url);
  }

  // 6. Obtener Items por Plan y Versión (Con Detalles)
  getPlanMedioItemsPorPlan(planMedioId: number, version: number): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem/by-plan/${planMedioId}/version/${version}`;
    console.log('🔄 GET PlanMedioItems por plan:', url);
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 7. Obtener Todos los Items con Detalles
  getAllPlanMedioItemsWithDetails(): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem/with-details`;
    console.log('🔄 GET Todos los PlanMedioItems con detalles:', url);
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // 8. Obtener Item por ID con Detalles
  getPlanMedioItemPorIdWithDetails(planMedioItemId: number): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}/with-details`;
    console.log('🔄 GET PlanMedioItem por ID con detalles:', url);
    return this.http.get<PlanMedioItemBackend>(url);
  }

  // 9. Actualizar Solo JSON (PATCH)
  actualizarDataJson(request: ActualizarDataJsonRequest): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItem/update-json`;
    console.log('🔄 PATCH PlanMedioItem (JSON):', url, request);
    return this.http.patch<OperacionExitosaResponse>(url, request);
  }

  // ==============================================
  // 🔄 PLAN MEDIO ITEM FLOWCHART - ENDPOINTS
  // ==============================================

  // 1. Crear Item de Flowchart
  crearPlanMedioItemFlowchart(request: CrearPlanMedioItemFlowchartRequest): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart`;
    console.log('🔄 POST PlanMedioItemFlowchart:', url, request);
    return this.http.post<PlanMedioItemFlowchartBackend>(url, request);
  }

  // 2. Actualizar Item de Flowchart
  actualizarPlanMedioItemFlowchart(request: ActualizarPlanMedioItemFlowchartRequest): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart`;
    console.log('🔄 PUT PlanMedioItemFlowchart:', url, request);
    return this.http.put<PlanMedioItemFlowchartBackend>(url, request);
  }

  // 3. Eliminar Item de Flowchart
  eliminarPlanMedioItemFlowchart(planMedioItemId: number): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/${planMedioItemId}`;
    console.log('🔄 DELETE PlanMedioItemFlowchart:', url);
    return this.http.delete<OperacionExitosaResponse>(url);
  }

  // 4. Obtener Item de Flowchart por ID
  getPlanMedioItemFlowchartPorId(planMedioItemId: number): Observable<PlanMedioItemFlowchartBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/${planMedioItemId}`;
    console.log('🔄 GET PlanMedioItemFlowchart por ID:', url);
    return this.http.get<PlanMedioItemFlowchartBackend>(url);
  }

  // 5. Obtener Items de Flowchart por Plan
  getPlanMedioItemsFlowchartPorPlan(planMedioId: number, version: number): Observable<PlanMedioItemFlowchartBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/by-plan/${planMedioId}/version/${version}`;
    console.log('🔄 GET PlanMedioItemsFlowchart por plan:', url);
    return this.http.get<PlanMedioItemFlowchartBackend[]>(url);
  }

  // 6. Actualizar Solo Calendario JSON
  actualizarCalendarioJson(request: ActualizarCalendarioJsonRequest): Observable<OperacionExitosaResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItemFlowchart/update-calendario`;
    console.log('🔄 PATCH PlanMedioItemFlowchart (CalendarioJSON):', url, request);
    return this.http.patch<OperacionExitosaResponse>(url, request);
  }



  // ==============================================
  // 🔧 MÉTODOS ADICIONALES Y COMPATIBILIDAD
  // ==============================================

  // ✅ MÉTODO EXISTENTE - Actualizar un PlanMedioItem existente (solo para JSON/spots)
  // Manteniendo para compatibilidad con código existente
  actualizarPlanMedioItem(request: ActualizarPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/update-json`;
    console.log('🔄 PATCH PlanMedioItem (JSON) - MÉTODO LEGACY:', url, request);
    return this.http.patch<PlanMedioItemBackend>(url, request);
  }

  // ✅ MÉTODO EXISTENTE - Descargar template
  descargarTemplatePantalla(request: { paisId: number; medioId: number }): Observable<Blob> {
    const url = `${this.baseUrl}/api/TemplatePantallaJson/download-template`;
    console.log('⬇️ POST descargarTemplatePantalla:', url, request);
    
    return this.http.post(url, request, {
      responseType: 'blob'  // 👈 Necesario para recibir archivos
    });
  }
} 