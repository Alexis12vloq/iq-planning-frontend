import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

export const APP_CONFIG_VALUE: AppConfig = {
  apiUrl: 'https://localhost:7223' // Configurado para localhost puerto 7223
  //apiUrl: 'https://iq-planningapi20250714104214-dnebf8aqhnerdjba.mexicocentral-01.azurewebsites.net' // Azure (comentado)
};
