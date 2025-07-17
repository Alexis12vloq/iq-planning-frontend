// Modelos para plantillas dinámicas de pautas

export interface CampoPlantilla {
  name: string;
  type: 'integer' | 'string' | 'decimal' | 'money' | 'time' | 'date' | 'boolean';
  label: string;
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  precision?: number;
  scale?: number;
  options?: string[];
  lookupTable?: string;
  lookupCategory?: string;
  lookupColumn?: string;
  displayColumn?: string;
  defaultValue?: any;
}

export interface PlantillaPauta {
  id: string;
  paisFacturacion: string;
  medio: string;
  nombre: string;
  descripcion?: string;
  fields: CampoPlantilla[];
  fechaCreacion: string;
  activa: boolean;
}

export interface DiaCalendario {
  fecha: Date;
  seleccionado: boolean;
  habilitado: boolean;
}

export interface RespuestaPauta {
  id: string;
  planId: string;
  plantillaId: string;
  paisFacturacion: string;
  medio: string;
  proveedor?: string;
  proveedorId?: string;
  planMedioItemId?: number; // ID del backend PlanMedioItem
  datos: { [key: string]: any }; // Respuestas dinámicas del formulario
  fechaCreacion: string;
  fechaModificacion?: string;
  // Campos calculados/agregados
  valorTotal?: number;
  valorNeto?: number;
  totalSpots?: number;
  semanas?: boolean[];
  // Información de calendario
  fechaInicio?: Date;
  fechaFin?: Date;
  diasSeleccionados?: string[]; // Array de fechas en formato 'YYYY-MM-DD'
  totalDiasSeleccionados?: number;
}

export interface LookupData {
  tabla: string;
  categoria?: string;
  datos: { codigo: string | number; valor: string; activo: boolean }[];
} 