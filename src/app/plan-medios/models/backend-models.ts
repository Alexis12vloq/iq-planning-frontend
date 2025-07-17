// Modelos para backend API
export interface MedioBackend {
  medioId: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  fechaRegistro: string;
  usuarioRegistro?: string;
  fechaModificacion?: string;
  usuarioModifico?: string;
}

export interface ProveedorBackend {
  proveedorId: number;
  medioId: number;
  codigoProveedor: string;
  nombreProveedor: string;
  grupoProveedor?: string;
  tipoProveedor?: string;
  tipoMedioProveedor?: string;
  orionBeneficioReal?: number;
  directoTradicionalMVSS?: number;
  kinessPower?: number;
  kinessGlass?: number;
  duoGlass?: number;
  duoPower?: number;
  notasKSO?: string;
  estado: boolean;
  fechaRegistro: string;
  usuarioRegistro?: string;
  fechaModificacion?: string;
  usuarioModifico?: string;
  medioNombre?: string;
} 