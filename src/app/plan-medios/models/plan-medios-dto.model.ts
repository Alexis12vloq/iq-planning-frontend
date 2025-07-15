export interface PlanMediosQuery {
  filter?: PlanMediosFilter;
  pagination?: PaginationDto;
}

export interface PlanMediosFilter {
  idPlan?: number;
  version?: number;
  numeroPlan?: number;
  campania?: string;
  paisesPauta?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  idEstadoRegistro?: number;
  anunciante?: string;
  cliente?: string;
  marca?: string;
  producto?: string;
}

export interface PaginationDto {
  pageNumber: number;    // Por defecto: 1
  pageSize: number;      // Por defecto: 10, máximo: 100
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PlanMediosListDto {
  idPlan: number;
  version: number;
  numeroPlan?: number;
  campania: string;
  fechaInicio: Date;
  fechaFin: Date;
  idEstadoRegistro: number;
  paisesPauta: string;
  idClienteAnunciante: number;
  idClienteFacturacion: number;
  idMarca: number;
  idProducto: number;
  anunciante: string;      // "Coca-Cola"
  cliente: string;         // "Coca-Cola Perú"
  marca: string;          // "Coca-Cola"
  producto: string;       // "Coca-Cola Original"
  pais: string;           // "Perú"
  tipoIngreso: string;    // "Plan de Medios"
  estado: string;         // "Activo" / "Inactivo"
} 

export interface TablaParametro {
  idPar: number;
  tabla: string;
  campo_Id: number;
  campo_Val: string;
  descripcion: string;
  campo_Est: boolean;
  fechaCreacion: Date;
  campo_Padre_Id: number;
}

export interface ParametroFiltro {
  id: number;
  nombre: string;
  descripcion?: string;
  padreId?: number;
  activo: boolean;
}