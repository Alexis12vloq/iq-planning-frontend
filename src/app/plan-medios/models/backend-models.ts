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
  canalId: number;
  canalNombre?: string;
  canalDescripcion?: string;
  tarifa: number;
  dataJson: string;
  pasoPorFlowchart?: boolean;
  plantillaCompletada?: boolean;
  dataPlantillaJson?: string;
  calendarioJson?: string;
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

// ✅ NUEVO: Modelo específico para Flowchart con todos los campos
export interface PlanMedioItemFlowchartBackend {
  planMedioItemId: number;
  planMedioId: number;
  version: number;
  medioId: number;
  medioNombre: string;
  proveedorId: number;
  proveedorNombre: string;
  canalId: number; // ✅ Agregar ID del canal
  canalNombre: string; // ✅ Agregar nombre del canal
  tarifa: number;
  dataJson: string;
  dataPlantillaJson: string;
  calendarioJson: string;
  fechaRegistro: string;
  fechaModificacion?: string;
  usuarioRegistro: string;
  usuarioModifico?: string;
  pasoPorFlowchart: boolean;
  plantillaCompletada: boolean;
}

// Requests para operaciones CRUD básicas
export interface CrearPlanMedioItemRequest {
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  canalId: number;
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
  canalId?: number;
  tarifa?: number;
  dataJson?: string;
  usuarioModifico?: string;
}

// ✅ NUEVO: Request para crear item de Flowchart
export interface CrearPlanMedioItemFlowchartRequest {
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  canalId: number; // ✅ AGREGAR campo canalId que faltaba
  tarifa: number;
  dataJson: string;
  dataPlantillaJson: string;
  usuarioRegistro: string;
}

// ✅ NUEVO: Request para actualizar item de Flowchart
export interface ActualizarPlanMedioItemFlowchartRequest {
  planMedioItemId: number;
  planMedioId: number;
  version: number;
  medioId: number;
  proveedorId: number;
  canalId: number; // ✅ AGREGAR campo canalId que faltaba
  tarifa: number;
  dataJson: string;
  dataPlantillaJson: string;
  usuarioModifico: string;
}

// ✅ NUEVO: Request para actualizar solo dataJson
export interface ActualizarDataJsonRequest {
  planMedioItemId: number;
  dataJson: string;
  usuarioModifico: string;
}

// ✅ NUEVO: Request para actualizar solo calendarioJson
export interface ActualizarCalendarioJsonRequest {
  planMedioItemId: number;
  calendarioJson: string;
  usuarioModifico: string;
}

// Responses genéricas
export interface EliminarPlanMedioItemResponse {
  success: boolean;
  message: string;
}

// ✅ NUEVO: Response genérica para operaciones exitosas
export interface OperacionExitosaResponse {
  success: boolean;
  message: string;
}

// Estructura para el dataJson de spots por fecha
export interface SpotsPorFechaData {
  spotsPorFecha: { [fecha: string]: number };
  totalSpots: number;
  valorTotal: number;
}

// ✅ NUEVO: Modelo para Template Pantalla JSON del backend
export interface TemplatePantallaJsonBackend {
  templateId: number;
  pantalla: string;
  paisId: number;
  paisNombre: string;
  tablaCompleta: string;
  medioId: number;
  medioNombre: string;
  jsonSchema: string; // JSON schema de la plantilla
  fechaCreacion: string;
  usuarioCreacion: string;
  fechaModificacion?: string;
  usuarioModificacion?: string;
  estado: boolean;
}

 