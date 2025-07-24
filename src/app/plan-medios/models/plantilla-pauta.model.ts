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
  medio: string;
  proveedor: string;
  proveedorId: string;
  canalId?: string; // ✅ Agregar ID del canal (opcional para compatibilidad)
  canal?: string; // ✅ Agregar nombre del canal (opcional para compatibilidad)
  planMedioItemId?: number;
  paisFacturacion: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  datos: any;
  totalSpots: number;
  valorTotal: number;
  valorNeto: number;
  semanas: boolean[];
  diasSeleccionados: string[];
  totalDiasSeleccionados?: number;
}

export interface LookupData {
  tabla: string;
  categoria?: string;
  datos: { codigo: string | number; valor: string; activo: boolean }[];
} 