import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../shared/app-config';

@Injectable({
  providedIn: 'root'
})
export class TablaParametrosService {
  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) private config: AppConfig
  ) {}

  getAll(): Observable<any> {
    return this.http.get(`${this.config.apiUrl}/api/TablaParametros`);
  }

  // Puedes agregar más métodos aquí (consultar, editar, eliminar, etc.)
}
