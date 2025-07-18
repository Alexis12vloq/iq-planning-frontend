// Interfaces para el backend
export interface MedioBackend {
  medioId: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  fechaRegistro: string;
}

export interface ProveedorBackend {
  proveedorId: number;
  medioId: number;
  nombreProveedor: string;
  grupoProveedor: string;
  tipoProveedor: string;
  orionBeneficioReal: number;
  estado: boolean;
  fechaRegistro: string;
}

// Estructura completa que viene del endpoint by-plan
export interface PlanMedioItemBackend {
  planMedioItemId: number;
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  tarifa: number;
  dataJson: string;
  fechaRegistro: string;
  usuarioRegistro: string;
  fechaModificacion?: string;
  usuarioModifico?: string;
  // Propiedades adicionales del endpoint by-plan
  medioNombre?: string;
  proveedorNombre?: string;
  planNumeroPlan?: string;
  planCampania?: string;
}

// Requests para operaciones CRUD
export interface CrearPlanMedioItemRequest {
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  tarifa: number;
  dataJson: string;
  usuarioRegistro: string;
}

export interface ActualizarPlanMedioItemRequest {
  planMedioItemId: number;
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  tarifa: number;
  dataJson: string;
  usuarioModifico: string;
}

// DTO para actualizar medio (PUT /api/PlanMedioItem)
export interface PlanMedioItemUpdateDto {
  planMedioItemId: number;
  planMedioId: number;
  version: number;
  medioId?: number;
  proveedorId?: number;
  tarifa?: number;
  dataJson?: string;
  usuarioModifico?: string;
}

export interface EliminarPlanMedioItemResponse {
  success: boolean;
  message: string;
}

// Estructura para el dataJson de spots por fecha
export interface SpotsPorFechaData {
  spotsPorFecha: { [fecha: string]: number };
  totalSpots: number;
  valorTotal: number;
} 