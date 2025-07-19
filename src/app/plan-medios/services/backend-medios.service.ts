import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG_VALUE } from '../../shared/app-config';
import { 
  MedioBackend, 
  ProveedorBackend, 
  PlanMedioItemBackend, 
  CrearPlanMedioItemRequest, 
  ActualizarPlanMedioItemRequest, 
  PlanMedioItemUpdateDto,
  EliminarPlanMedioItemResponse 
} from '../models/backend-models';

@Injectable({
  providedIn: 'root'
})
export class BackendMediosService {
  private baseUrl = APP_CONFIG_VALUE.apiUrl;

  constructor(private http: HttpClient) {}

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

  // Obtener PlanMedioItem por plan ID y versión
  getPlanMedioItemsPorPlan(planMedioId: number, version: number): Observable<PlanMedioItemBackend[]> {
    const url = `${this.baseUrl}/api/PlanMedioItem/by-plan/${planMedioId}/version/${version}`;
    console.log('🔄 GET PlanMedioItems por plan:', url);
    return this.http.get<PlanMedioItemBackend[]>(url);
  }

  // Crear un nuevo PlanMedioItem
  crearPlanMedioItem(request: CrearPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    console.log('🔄 POST PlanMedioItem:', url, request);
    return this.http.post<PlanMedioItemBackend>(url, request);
  }
  
  descargarTemplatePantalla(request: { paisId: number; medioId: number }): Observable<Blob> {
    const url = `${this.baseUrl}/api/TemplatePantallaJson/download-template`;
    console.log('⬇️ POST descargarTemplatePantalla:', url, request);
    
    return this.http.post(url, request, {
      responseType: 'blob'  // 👈 Necesario para recibir archivos
    });
  }
  // Actualizar un PlanMedioItem existente (solo para JSON/spots)
  actualizarPlanMedioItem(request: ActualizarPlanMedioItemRequest): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/update-json`;
    console.log('🔄 PATCH PlanMedioItem (JSON):', url, request);
    return this.http.patch<PlanMedioItemBackend>(url, request);
  }

  // Actualizar un PlanMedioItem completo (para modificar medio)
  updatePlanMedioItem(dto: PlanMedioItemUpdateDto): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem`;
    console.log('🔄 PUT PlanMedioItem (Update):', url, dto);
    return this.http.put<PlanMedioItemBackend>(url, dto);
  }

  // Eliminar un PlanMedioItem
  eliminarPlanMedioItem(planMedioItemId: number): Observable<EliminarPlanMedioItemResponse> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    console.log('🔄 DELETE PlanMedioItem:', url);
    return this.http.delete<EliminarPlanMedioItemResponse>(url);
  }

  // Obtener un PlanMedioItem específico por ID
  getPlanMedioItemPorId(planMedioItemId: number): Observable<PlanMedioItemBackend> {
    const url = `${this.baseUrl}/api/PlanMedioItem/${planMedioItemId}`;
    console.log('🔄 GET PlanMedioItem por ID:', url);
    return this.http.get<PlanMedioItemBackend>(url);
  }
} 