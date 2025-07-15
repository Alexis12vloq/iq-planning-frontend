import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

export const APP_CONFIG_VALUE: AppConfig = {
 
  apiUrl: 'https://iq-planningapi20250714104214-dnebf8aqhnerdjba.mexicocentral-01.azurewebsites.net' // Cambia el puerto según tu backend
  //apiUrl: 'http://localhost:5203' // Cambia el puerto según tu backend
};
