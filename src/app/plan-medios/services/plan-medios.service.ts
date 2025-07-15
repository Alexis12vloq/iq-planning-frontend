import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../shared/app-config';

@Injectable({
  providedIn: 'root'
})
export class PlanMediosService {
  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {}

  crearPlanMedios(body: any): Observable<any> {
    return this.http.post(`${this.config.apiUrl}/api/PlanMedios`, body);
  }

  // Puedes agregar más métodos aquí (consultar, editar, eliminar, etc.)
}
